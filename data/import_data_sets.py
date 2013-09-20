from __future__ import unicode_literals

import webnotes, utils, MySQLdb, os, json

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
			add_values(fname, fpath)
		

def add_values(fname, fpath):
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
				"raw_filename": fname,
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

if __name__=="__main__":
	webnotes.init()
	webnotes.connect()
	start()