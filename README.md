## Open Data Project

Viewer for Open Data in India. Based on wnframework

##### Install

1. Install

		$ mkdir opendataproject
		$ cd opendataproject
		$ git clone git@github.com:webnotes/opendataproject app
		$ git clone git@github.com:webnotes/wnframework lib
		# cd lib && git checkout wsgi && cd lib..
		$ lib/wnf.py --make_conf
		$ lib/wnf.py --reinstall
		$ python lib/webnotes/app.py 9000
	
1. Go to your browser localhost:9000