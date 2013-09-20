from __future__ import unicode_literals

import os, utils, sys, re, json, difflib, MySQLdb

exclude_from_headers = {
	"Download XLS for ": "",
	"Download CSV for ": "",
	"(External Link that opens in a new window)": "",
	" - ": "-",
	"%": "percent",
	",": " ",
	"#": " ",
	"/": "-"
}

def start():
	print "building state and district masters..."
	
	webnotes.conn.sql("delete from `tabData Set`");
	
	webnotes.conn.auto_commit_on_many_writes = True
	for fname in os.listdir(os.path.join("app", "downloads", "data.gov.in")):
		if fname.endswith(".csv"):
			fpath = os.path.join("app", "downloads", "data.gov.in", fname)
			print fname
			add_values(fpath)
		

def add_values(fpath):
	headers, data = utils.get_file_data(fpath)
	if not data:
		return

	if not headers["title"]:
		return

	add_regions(data)
	
	for key, value in exclude_from_headers.iteritems():
		headers["title"] = headers["title"].replace(key, value)

	data_set = headers["title"][:170].replace(" ", "-").lower()

	if not webnotes.conn.exists("Data Set", data_set):
		try:
			webnotes.bean({
				"doctype": "Data Set",
				"name": data_set,
				"title": headers["title"],
				"description": headers["description"],
				"raw_filename": headers["file_name"],
				"url": headers["url"],
				"source": "data.gov.in",
				"__islocal": 1
			}).save()
		except MySQLdb.IntegrityError, e:
			pass

		# webnotes.conn.sql("""delete from `tabData Value` where data_set=%s""", data_set)
		# doc = webnotes.doc("Data Value")
		# for row_id, row in enumerate(data):
		# 	for col_id, val in enumerate(row):
		# 		doc.fields = {
		# 			"doctype": "Data Value",
		# 			"value": val,
		# 			"data_set": data_set,
		# 			"row_id": row_id,
		# 			"col_id": col_id,
		# 			"__islocal": 1
		# 		}
		# 		doc.save()
			
	webnotes.conn.commit()
	
def add_regions(data):
	if data[0][0].lower()=="state":
		states = list(set(d[0] for d in data[1:]))
		for d in states:
			if not webnotes.conn.exists("Region", d.title().strip()):
				webnotes.bean({"doctype":"Region", "region_type":"State", 
					"name":d.title().strip() }).insert()
					
		webnotes.conn.commit()
					
		if data[0][1].lower()=="district":
			for row in data[1:]:
				if row[1] and not webnotes.conn.exists("Region", row[1].title().strip()):
					webnotes.bean({"doctype": "Region", "region_type":"District", 
						"parent_region": row[0].title(), "name": row[1].title().strip() }).insert()
					
			webnotes.conn.commit()




def process_file(fpath):
	print "Processing " + fpath
	headers, data = utils.get_file_data(fpath)
	if data and headers:
		# dataset
		data_set = webnotes.bean({
			"doctype": "Data Set",
			"name": headers["title"],
			"description": headers["description"],
			"raw_filename": headers["file_name"],
			"url": headers["url"],
			"source": "data.gov.in"
		}).insert()
		
		data = clean_data(data)
		set_series(headers, data)
		set_data(headers, data)

def clean_data(data):
	"""
	truncate empty rows and columns
	"""
	data = truncate_empty_rows(data)
	
	# transpose
	data = zip(*data)
	data = truncate_serial_number_row(data)
	data = truncate_empty_rows(data)
	
	# transpose back to original format
	data = zip(*data)
	
	return data

def truncate_empty_rows(data):
	newdata = []
	empty_rows = 0
	for row in data:
		if sum(map(lambda d: True if d else False, row)):
			empty_rows = 0
			newdata.append(row)
		else:
			empty_rows += 1
			if empty_rows > 2:
				# three empty rows on a trot?
				# thats it!
				break
	
	return newdata
	
def truncate_serial_number_row(data):
	row = data[0]
	to_check = min(5, len(row))
	matched = 0
	for i, value in enumerate(row[1:]):
		try:
			v = utils.flt(value)
		except ValueError:
			v = 0
		if v==utils.flt(i+1):
			matched+=1
	
	if float(matched) / to_check > 0.8:
		data = data[1:]
		
	return data

def set_series(headers, data):
	"""
	extract series from the data and guess its type
	also set headings, region, period in the db.
	first row must be a series
	for columns, there could be zero or any number of columns that are series.
	"""
	# columns
	headers["series"] = series = []
	series.append({
		"position": "column",
		"idx": 0,
		"values": [d.strip() for d in data[0]]
	})

	# transpose
	data = zip(*data)

	# rows: search for 0 or more row headers
	for i, row in enumerate(data[:-1]):
		row = row[1:]
		if is_numeric(row) and not is_series_period(row):
			break
		else:
			series.append({
				"position": "row",
				"idx": i,
				"values": [d.strip() for d in row]
			})

	# transpose back
	data = zip(*data)

	# guess row headres
	for s in series[1:]:
		guess_series(s, headers)

	# adjust column headers based on number of row-series
	row_series_count = sum(map(lambda s: s["position"]=="row" and 1 or 0, series))
	headers["row_series_count"] = row_series_count
	series[0]["values"] = series[0]["values"][row_series_count:]
	
	# guess column headers (once the rows headers have been adjusted)
	guess_series(series[0], headers)

def guess_series(s, headers):
	updated = []
	values = s["values"]
	
	if is_series_period(values):
		# period
		for value in values:
			match = re.search("[0-9]{4}[-0-9]*", value) or re.search("[0-9]{2}-[0-9]{2}", value)
			if match:
				value = match.group(0)
			webnotes.bean({"DocType":"Period", "name": value}).insert()
			webnotes.commit()
			updated.append(value)
	
		# update only matched part where applicable
		s["values"] = updated
		s["type"] = "period"

	elif is_series_region(values):
		# states
		for value in values:
			matches = difflib.get_close_matches(value, states)
			value = matches[0] if matches else value
			updated.append(value)
			webnotes.bean({"DocType":"Region", "name": value}).insert()

		s["values"] = updated
		s["type"] = "region"
	else:
		for value in values:
			webnotes.bean({
				"doctype":"Data Head", 
				"name": value[:150], 
				"data_set": headers["title"], 
				"title": value}).insert()
			webnotes.commit()
			
def set_data(headers, data):
	"""
	set data in the data table. set region, 
	period properties if identified in series
	"""
	start_col = headers["row_series_count"]
	series = headers["series"]

	def set_key(d, s, key, idx):
		if s.get("type")==key:
			d[key] = s["values"][idx]
			return True
		return False
	
	def set_keys_or_head(d, s, row_idx, col_idx, heads):
		idx = row_idx if s["position"]=="row" else col_idx
		region = set_key(d, s, "region", idx)
		period = set_key(d, s, "period", idx)
		
		# add as head
		if not (region or period):
			heads.append(s["values"][idx])

	for row_idx, row in enumerate(data[1:]):
		for col_idx, value in enumerate(row[start_col:]):
			if not utils.is_number(value):
				continue
			
			heads = []
			
			d = {
				"doctype": "Data Value",
				"value": value,
				"dataset": headers["title"]
			}
			
			for s in series:
				set_keys_or_head(d, s, row_idx, col_idx, heads)
			
			# assume only one head!
			if heads:
				d["data_head"] = heads[0]
			
			value = webnotes.bean(d).insert()

def is_numeric(row):
	return True if sum(map(utils.is_number, row)) else False

def is_series_period(series):
	def is_year(v):
		if len(v) > 30:
			return False
		if len(v)==4 and utils.is_number(v):
			v = utils.flt(v)
			return v > 1900 and v < 2050
		else:
			matched = re.search("19[0-9]{2}[^0-9]+", v) \
				or re.search("20[0-9]{2}[^0-9]+", v) \
				or re.search("[0189][0-9]-[0189][0-9]", v)
				
			return matched
			
	matched = match_series(series, is_year)
	# if matched:
	# 	print series
	# 	raw_input("ok")
	return matched

def is_series_region(series):
	return match_series(series, lambda v: difflib.get_close_matches(v, states))

def match_series(series, rule, confidence=0.7):
	"""return true if more than 7/10 match"""	
	to_check = min(len(series), 10)
	unmatched = 0
	for i in xrange(to_check):
		if not rule(series[i]):
			unmatched += 1
		if (float(unmatched) / to_check) > (1 - confidence):
			return False

	return True

if __name__=="__main__":
	sys.path.insert(0,".")
	sys.path.insert(0,"lib")
	sys.path.insert(0,"app")
	import webnotes
	webnotes.init()
	webnotes.connect()
	start()