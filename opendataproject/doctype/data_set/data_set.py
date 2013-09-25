# Copyright (c) 2013, Web Notes Technologies Pvt. Ltd.
# MIT License. See license.txt

# For license information, please see license.txt

from __future__ import unicode_literals
import webnotes

class DocType:
	def __init__(self, d, dl):
		self.doc, self.doclist = d, dl
		
	def get_context(self):
		from data.utils import get_file_data
		from webnotes.utils import get_path
		headers, self.doc.data = get_file_data(get_path("app", "downloads", 
			"data.gov.in", self.doc.raw_filename))
		self.doc.max_cols = max([len(r) for r in self.doc.data])
		
		self.doc.comment_list = webnotes.conn.sql("""\
			select comment, comment_by_fullname, creation
			from `tabComment` where comment_doctype="Data Set"
			and comment_docname=%s order by creation""", self.doc.name, as_dict=1)
		