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
			showHeaderRow: true,
			headerRowHeight: 30,
			explicitInitialization: true
		};
	},
	make: function() {
		var me = this;
		this.columnFilters = {};
		this.make_dataview();
		this.grid = new Slick.Grid("#datasetgrid", this.dataView, this.columns, this.options);
		this.grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
		// this.grid.registerPlugin(this.checkboxSelector);
		// this.grid.setSelectedRows(this.conf.selected_rowids);

		this.grid.onClick.subscribe(function (e) {
			var cell = me.grid.getCellFromEvent(e);
			me.show_chart(datasets[cell.row]);
			e.stopPropagation();
		});
		
		$(this.grid.getHeaderRow()).delegate(":input", "change keyup", function (e) {
			var columnId = $(this).data("columnId");
			if (columnId != null) {
				me.columnFilters[columnId] = $.trim($(this).val());
				me.dataView.refresh();
			}
		});
		
		this.grid.onHeaderRowCellRendered.subscribe(function(e, args) {
			$(args.node).empty();
			$("<input type='text'>")
				.data("columnId", args.column.id)
				.val(me.columnFilters[args.column.id])
				.appendTo(args.node);
		});
		this.grid.init();
		this.resize();
	},
	
	make_dataview: function() {
		// initialize the model
		this.dataView = new Slick.Data.DataView({ inlineFilters: true });
		this.dataView.beginUpdate();
		this.dataView.setItems(datasets);
		this.dataView.setFilter(this.inline_filter);
		this.dataView.endUpdate();
		
		var me = this;
		this.dataView.onRowCountChanged.subscribe(function (e, args) {
			me.grid.updateRowCount();
			me.grid.render();
		});

		this.dataView.onRowsChanged.subscribe(function (e, args) {
			me.grid.invalidateRows(args.rows);
			me.grid.render();
		});
	},
	
	inline_filter: function (item) {
		var me = window.data_set_viewer;
		for (var columnId in me.columnFilters) {
			if (columnId !== undefined && me.columnFilters[columnId] !== "") {
				var c = me.grid.getColumns()[me.grid.getColumnIndex(columnId)];
				if(!(c.field==="title" && item[c.field].toLowerCase().indexOf(me.columnFilters[columnId])!==-1)) {
					return false;
				}
			}
		}
		return true;
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