import webnotes, sys

def start():
	for ds in webnotes.conn.sql("""select name, raw_filename from `tabData Set`""", as_dict=1):
		from data.utils import get_file_data
		from webnotes.utils import get_path
		
		if ds.raw_filename:
			headers, data = get_file_data(get_path("app", "downloads", 
				"data.gov.in", ds.raw_filename))
			
			webnotes.conn.set_value("Data Set", ds.name, "row_count", len(data))
	
	webnotes.conn.commit()

if __name__=="__main__":
	webnotes.connect()
	webnotes.init()
	start()