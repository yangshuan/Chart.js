(function(){
	"use strict";

	var root = this,
		Chart = root.Chart,
		helpers = Chart.helpers;


	var defaultConfig = {
		//Boolean - Whether the scale should start at zero, or an order of magnitude down from the lowest value
		scaleBeginAtZero : true,

		//Boolean - Whether grid lines are shown across the chart
		scaleShowGridLines : true,

		//String - Colour of the grid lines
		scaleGridLineColor : "rgba(0,0,0,.05)",

		//Number - Width of the grid lines
		scaleGridLineWidth : 1,

		tooltipTemplate: "<%for (var i = 0; i < labels.length; i++){%><%=labels[i]%>: <%}%><%= values[i] %>",

		//Boolean - If there is a stroke on each bar
		barShowStroke : true,

		//Number - Pixel width of the bar stroke
		barStrokeWidth : 2,

		//Number - Spacing between each of the X value sets
		barValueSpacing : 5,

		//Number - Spacing between data sets within X values
		barDatasetSpacing : 1,

		//String - A legend template
		legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].fillColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"

	};

	Chart.StackedBar = Chart.Element.extend({
		draw: function() {
			var ctx = this.ctx,
				halfWidth = this.width/2,
				leftX = this.x - halfWidth,
				rightX = this.x + halfWidth,
				top = this.top,
				halfStroke = this.strokeWidth / 2;

			// Canvas doesn't allow us to stroke inside the width so we can
			// adjust the sizes to fit if we're setting a stroke on the line
			if (this.showStroke){
				leftX += halfStroke;
				rightX -= halfStroke;
				for (var i = 0; i < this.tops.length; i++) {
					tops[i] += halfStroke;
				}
			}

			ctx.beginPath();

			for (var i = 0; i < this.values.length; i++) {
				ctx.fillStyle = this.fillColors[i];
				ctx.strokeStyle = this.strokeColors[i];
				ctx.lineWidth = this.lineWidth;

				ctx.beginPath();
				ctx.moveTo(leftX, this.bases[i]);
				ctx.lineTo(leftX, this.tops[i]);
				ctx.lineTo(rightX, this.tops[i]);
				ctx.lineTo(rightX, this.bases[i]);
				ctx.fill();
				ctx.closePath();
				if (this.showStroke) {
					ctx.stroke();
				}
			}
		},
		getOffsetValue: function(valueIndex) {
			var offset = 0;
			for (var i = 0; i < valueIndex; i++) {
				offset += this.values[i];
			}
			return offset;
		},
		hasValue: function() {
			if (this.values.length > 0) {
				return true;
			}
			return false;
		},
		inRange : function(chartX,chartY,isNegative){
			return (chartX >= this.x - this.width/2 && chartX <= this.x + this.width/2) && ((chartY >= this.tops[this.tops.length - 1] && chartY <= this.bases[0]) || (isNegative && chartY <= this.tops[this.tops.length - 1] && chartY >= this.bases[0]));
		}
	});

	Chart.Type.extend({
		name: "Stackedbar",
		defaults : defaultConfig,
		initialize:  function(data){

			//Expose options as a scope variable here so we can access it in the ScaleClass
			var options = this.options;

			this.ScaleClass = Chart.Scale.extend({
				offsetGridLines : true,
				calculateBarX : function(datasetCount, datasetIndex, barIndex){
					//Reusable method for calculating the xPosition of a given bar based on datasetIndex & width of the bar
					var xWidth = this.calculateBaseWidth(),
						xAbsolute = this.calculateX(barIndex) - (xWidth/2),
						barWidth = this.calculateBarWidth(datasetCount);

					return xAbsolute + (barWidth * datasetIndex) + (datasetIndex * options.barDatasetSpacing) + barWidth/2;
				},
				calculateBaseWidth : function(){
					return (this.calculateX(1) - this.calculateX(0)) - (2*options.barValueSpacing);
				},
				calculateBarWidth : function(datasetCount){
					//The padding between datasets is to the right of each bar, providing that there are more than 1 dataset
					var baseWidth = this.calculateBaseWidth() - ((datasetCount - 1) * options.barDatasetSpacing);

					return (baseWidth / datasetCount);
				}
			});

			this.datasets = [];
			this.labelValues = [];

			//Set up tooltip events on the chart
			if (this.options.showTooltips){
				helpers.bindEvents(this, this.options.tooltipEvents, function(evt){
					var activeBar = (evt.type !== 'mouseout') ? this.getBarAtEvent(evt) : [];
					if (!activeBar || activeBar.length === 0) {
						this.draw();
						return;
					}
					helpers.each(this.bars, function(bar){
						bar.restore(['fillColor', 'strokeColor']);
					});
					var tooltipLabels = [],
						tooltipColors = [],
						medianPosition = (function() {
							var xMax,
								yMax,
								xMin,
								yMin;
							yMin = activeBar.bases[0];
							yMax = activeBar.tops[activeBar.tops.length - 1];

							xMin = activeBar.x - activeBar.width / 2;
							xMax = activeBar.x + activeBar.width / 2;
							return {
								x: (xMin > this.chart.width/2) ? xMin : xMax,
								y: (yMin + yMax)/2
							};
						}).call(this);
					activeBar.fillColor = activeBar.highlightFill;
					activeBar.strokeColor = activeBar.highlightStroke;
					//Include any colour information about the element
					helpers.each(activeBar.values, function(value, index) {
						var mockObj = {
							value: value
						};
						tooltipLabels.push(helpers.template(this.options.multiTooltipTemplate, mockObj));
						tooltipColors.push({
							fill: activeBar.fillColors[index],
							stroke: activeBar.strokeColors[index]
						});
					}, this);
					new Chart.MultiTooltip({
						x: medianPosition.x,
						y: medianPosition.y,
						xPadding: this.options.tooltipXPadding,
						yPadding: this.options.tooltipYPadding,
						xOffset: this.options.tooltipXOffset,
						fillColor: this.options.tooltipFillColor,
						textColor: this.options.tooltipFontColor,
						fontFamily: this.options.tooltipFontFamily,
						fontStyle: this.options.tooltipFontStyle,
						fontSize: this.options.tooltipFontSize,
						titleTextColor: this.options.tooltipTitleFontColor,
						titleFontFamily: this.options.tooltipTitleFontFamily,
						titleFontStyle: this.options.tooltipTitleFontStyle,
						titleFontSize: this.options.tooltipTitleFontSize,
						cornerRadius: this.options.tooltipCornerRadius,
						labels: tooltipLabels,
						legendColors: tooltipColors,
						legendColorBackground : this.options.multiTooltipKeyBackground,
						title: activeBar.label,
						chart: this.chart,
						ctx: this.chart.ctx
					}).draw();
				});
			}

			//Declare the extension of the default point, to cater for the options passed in to the constructor
			this.BarClass = Chart.StackedBar.extend({
				strokeWidth : this.options.barStrokeWidth,
				showStroke : this.options.barShowStroke,
				ctx : this.chart.ctx
			});

			//Iterate through each of the datasets, and build this into a property of the chart
			helpers.each(data.datasets,function(dataset,datasetIndex){
				this.labelValues.push(dataset.label);
			},this);

			this.bars = [];
			helpers.each(data.datasets[0].data, function(value, index) {
				var values = [],
					strokeColors = [],
					fillColors = [],
					highlightFills = [],
					highlightStrokes = [],
					bases = [],
					tops = [];
				helpers.each(data.datasets, function(dataset, datasetIndex) {
					values.push(dataset.data[index]);
					strokeColors.push(dataset.strokeColor);
					fillColors.push(dataset.fillColor);
					highlightFills.push(dataset.highlightFill || dataset.fillColor);
					highlightStrokes.push(dataset.highlightStroke || dataset.strokeColor);
				});

				this.bars.push(new this.BarClass({
					values: values,
					strokeColors: strokeColors,
					fillColors: fillColors,
					highlightFills: highlightFills,
					highlightStrokes: highlightStrokes,
					labels: this.labelValues,
					label: data.labels[index]
				}));
			}, this);

			this.buildTitle();

			this.buildScale(data.labels);

			this.BarClass.prototype.base = this.calculateNegative();

			helpers.each(this.bars, function(bar, barIndex) {
				var bases = [],
					tops = [];
				helpers.each(bar.values, function(value, index) {
					bases.push(this.calculateNegative());
					tops.push(this.calculateNegative());
				}, this);
				helpers.extend(bar, {
					width : this.scale.calculateBarWidth(1),
					x: this.scale.calculateBarX(1, 0, barIndex),
					bases: bases,
					tops: tops
				});
				bar.save();
			}, this);

			this.buildLegend(data.datasets);

			this.render();
		},
		calculateNegative : function() {
			return this.options.showNegative ? this.scale.calculateY(0) : this.scale.endPoint;
		},
		update : function(){
			this.scale.update();
			// Reset any highlight colours before updating.
			helpers.each(this.activeElements, function(activeElement){
				activeElement.restore(['fillColor', 'strokeColor']);
			});

			helpers.each(this.bars, function(bar){
				bar.save();
			});
			this.render();
		},
		getBarAtEvent : function(e){
			var eventPosition = helpers.getRelativePosition(e),
				activeBar;

			helpers.each(this.bars, function(bar, index) {
				var isNegative = false;
				helpers.each(bar.values, function(value, valueIndex){
					if (value < 0) {
						isNegative = true;
					}
				}, this);
				if (bar.inRange(eventPosition.x, eventPosition.y, isNegative)) {
					activeBar = bar;
				}
			}, this);

			return activeBar;
		},
		buildScale : function(labels){
			var self = this;

			var dataTotal = function(){
				var values = [];
				self.eachBars(function(bar){
					values.push(bar.value);
				});
				return values;
			};

			var longestTextWidth = helpers.longestText(this.chart.ctx, helpers.fontString(this.options.legendFontSize, this.options.legendFontStyle, this.options.legendFontFamily), this.labelValues) + this.options.legendFontSize + 3;
			var legendWidth = longestTextWidth + (this.options.legendXPadding*2);

			var scaleOptions = {
				templateString : this.options.scaleLabel,
				height : this.chart.height,
				width : this.chart.width,
				ctx : this.chart.ctx,
				textColor : this.options.scaleFontColor,
				fontSize : this.options.scaleFontSize,
				fontStyle : this.options.scaleFontStyle,
				fontFamily : this.options.scaleFontFamily,
				valuesCount : labels.length,
				beginAtZero : this.options.scaleBeginAtZero,
				integersOnly : this.options.scaleIntegersOnly,
				calculateYRange: function(currentHeight){
					var updatedRanges = helpers.calculateScaleRange(
						dataTotal(),
						currentHeight,
						this.fontSize,
						this.beginAtZero,
						this.integersOnly
					);
					helpers.extend(this, updatedRanges);
				},
				xLabels : labels,
				font : helpers.fontString(this.options.scaleFontSize, this.options.scaleFontStyle, this.options.scaleFontFamily),
				lineWidth : this.options.scaleLineWidth,
				lineColor : this.options.scaleLineColor,
				gridLineWidth : (this.options.scaleShowGridLines) ? this.options.scaleGridLineWidth : 0,
				gridLineColor : (this.options.scaleShowGridLines) ? this.options.scaleGridLineColor : "rgba(0,0,0,0)",
				padding : (this.options.showScale) ? 0 : (this.options.barShowStroke) ? this.options.barStrokeWidth : 0,
				showLabels : this.options.scaleShowLabels,
				display : this.options.showScale,
				titleHeight : this.options.showTitle ? this.options.titleFontSize : 0,
				legendWidth : this.options.showLegend ? legendWidth : 0
			};

			if (this.options.scaleOverride){
				helpers.extend(scaleOptions, {
					calculateYRange: helpers.noop,
					steps: this.options.scaleSteps,
					stepValue: this.options.scaleStepWidth,
					min: this.options.scaleStartValue,
					max: this.options.scaleStartValue + (this.options.scaleSteps * this.options.scaleStepWidth)
				});
			}

			this.scale = new this.ScaleClass(scaleOptions);
		},
		addData : function(valuesArray,label){
			var strokeColors = [],
				fillColors = [],
				highlightFills = [],
				highlightStrokes = [],
				bases = [],
				tops = [];
			helpers.each(data.datasets, function(dataset, datasetIndex) {
				strokeColors.push(dataset.strokeColor);
				fillColors.push(dataset.fillColor);
				highlightFills.push(dataset.highlightFill || dataset.fillColor);
				highlightStrokes.push(dataset.highlightStroke || dataset.strokeColor);
			});
			helpers.each(valuesArray, function(value, index) {
				bases.push(this.calculateNegative());
				tops.push(this.calculateNegative());
			}, this);
			this.bars.push(new this.BarClass({
				values: valuesArray,
				strokeColors: strokeColors,
				fillColors: fillColors,
				highlightFills: highlightFills,
				highlightStrokes: highlightStrokes,
				width : this.scale.calculateBarWidth(1),
				x: this.scale.calculateBarX(1, 0, this.bars.length + 1),
				bases: bases,
				tops: tops
			}));

			this.scale.addXLabel(label);
			//Then re-render the chart.
			this.update();
		},
		removeData : function(){
			this.scale.removeXLabel();
			//Then re-render the chart.
			this.bars.shift();
			this.update();
		},
		reflow : function(){
			helpers.extend(this.BarClass.prototype,{
				y: this.scale.endPoint,
				base : this.calculateNegative()
			});
			var newScaleProps = helpers.extend({
				height : this.chart.height,
				width : this.chart.width
			});
			this.scale.update(newScaleProps);
		},
		draw : function(ease){
			var easingDecimal = ease || 1;
			this.clear();

			var ctx = this.chart.ctx;

			this.title.draw();

			this.scale.draw(easingDecimal);

			//Draw all the bars for each dataset
			helpers.each(this.bars, function(bar, barIndex) {
				if (bar.hasValue()) {
					var bases = [],
						tops = [];
					helpers.each(bar.values, function(value, valueIndex) {
						bases.push(this.scale.calculateY(bar.getOffsetValue(valueIndex)));
						tops.push(this.scale.calculateY(bar.getOffsetValue(valueIndex) + value));
					}, this);
					bar.transition({
						bases: bases,
						tops: tops,
						width: this.scale.calculateBarWidth(1),
						x: this.scale.calculateBarX(1, 0, barIndex)
					}, easingDecimal).draw();
				}
			}, this);

			this.legend.draw();
		}
	});


}).call(this);