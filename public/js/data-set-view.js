var DataSetViewer = Class.extend({
	init: function() {
		this.wrapper = $("#datasetgrid");
		this.columns = [
		  {id: "title", name: "Title", field: "title", width: 400},
		  {id: "row_count", name: "Row Count", field: "row_count"},
		  {id: "rating", name: "Rating", field: "rating"},
		];
		this.options = {
			enableCellNavigation: true,
			enableColumnReorder: false,
			syncColumnCellResize: true,
			forceFitColumns: true,
			rerenderOnResize: true,
		};
		this.make();
		this.resize();
	},
	make: function() {
		var me = this;
		this.grid = new Slick.Grid("#datasetgrid", datasets, this.columns, this.options);
		this.grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
		// this.grid.registerPlugin(this.checkboxSelector);
		// this.grid.setSelectedRows(this.conf.selected_rowids);

		this.grid.onClick.subscribe(function (e) {
			var cell = me.grid.getCellFromEvent(e);
			me.show_chart(datasets[cell.row]);
			e.stopPropagation();
		  }
		);
	},

	resize: function() {
		if(this.chart_view) {
			this.chart_view.resize();
		} else {
			this.resize_data_set_grid();
		}
		
	},
	
	resize_data_set_grid: function() {
		var width = $(window).width();
		this.columns[0].width = parseInt(width * 0.8);
		this.columns[1].width = parseInt(width * 0.1);
		this.columns[1].width = parseInt(width * 0.1);
		this.wrapper.css("height", $(window).height()-52).css("width", width);
		this.grid.resizeCanvas();
	},
	
	show: function() {
		this.chart_view = null;
		$("head title, .navbar-brand").text("OpenDataProject.in");
		$("#chart-view").toggle(false);
		$("#data-set-view").toggle(true);
		this.resize_data_set_grid();
	},
	
	show_chart: function(d) {
		$("#data-set-view").toggle(false);
		$("#chart-view").toggle(true);
		this.chart_view = new ChartBuilder({
			url: "app/data/" + d.raw_filename,
			title: d.title
		});
	}
})