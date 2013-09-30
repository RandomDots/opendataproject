import webnotes, os
from webnotes.utils import get_path

def on_build():
	"""make synlink of downloads in public"""
	if not os.path.exists(get_path("app", "public", "data")):
		os.symlink(get_path("app", "downloads", "data.gov.in"), get_path("app", "public", "data"))