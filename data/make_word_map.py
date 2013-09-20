import webnotes, sys

eliminate_list = (".", "'s", "'", "*")
replace_with_space = (".", ",", ";", ":", "-", "/", "(", ")")
common_list = ("Refers", "Provides", "Details", "Constant", "According", "During", "Schemes", 
	"Approved", "Consists", "Number", "Arrived", "Through")

def start():
	webnotes.conn.sql("""delete from tabWord""")
	webnotes.conn.sql("""delete from `tabWord Data Set`""")
	webnotes.conn.commit()
	webnotes.conn.auto_commit_on_many_writes = True
	for d in webnotes.conn.sql("""select name, ifnull(title, "") as title, 
		ifnull(description, "") as description 
		from `tabData Set`""", as_dict=True):
		sys.stdout.write(".")
		sys.stdout.flush()

		# cleanup
		all_text = d.title + d.description
		all_text = all_text.replace("%", "percent").replace('"', "")
		for t in replace_with_space:
			all_text = all_text.replace(t, " ")
		for t in eliminate_list:
			all_text = all_text.replace(t,"")

		for word in all_text.split():
			name = word.title()
			if len(name) > 5 and (name not in common_list):
				if not webnotes.conn.exists("Word", name):
					webnotes.doc({"doctype": "Word", "name": name, "count": 1}).insert()
				else:
					webnotes.conn.sql("""update tabWord set `count`=`count` + 1 where name=%s""", name)
					
				if not webnotes.conn.sql("""select name from `tabWord Data Set` 
					where word=%s and data_set=%s""", (name, d.name)):
					webnotes.doc({"doctype": "Word Data Set", "data_set": d.name, "word": name}).insert()
	
	webnotes.conn.sql("""delete from `tabWord Data Set` wds, tabWord w where
		w.`count` < 50 and w.name = wds.word""")
		
	webnotes.conn.sql("""delete from tabWord where `count`< 50""")
	
	webnotes.conn.commit()

if __name__=="__main__":
	webnotes.connect()
	webnotes.init()
	start()