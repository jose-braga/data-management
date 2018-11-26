(function(){
    var unitGenderInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'unit/charts/gender/template.html'
        };
    };
    var genderChart = function (d3) {
        return {
            restrict: 'E',
            //templateUrl: 'unit/charts/unit.genderChart.html',
            scope: {info: '='},
            compile: function (element, attrs, transclude ) {
                // Set attributes
                var width = 200+100,
                height = 200,
                radius = Math.min(width, height) / 2,
                labelSize = 10,
                lineSpacing = 20;


                // Create a SVG root element and configure layout
                var svg = d3.select(element[0])
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .append('g')                //make a group to hold our pie chart
                    .attr('transform', 'translate(' + radius + ',' + radius + ')')    //move the center of the pie chart from 0, 0 to radius, radius;
                    .append('g').attr('class', 'pie-chart');

                var arc = d3.arc()              //this will create <path> elements for us using arc data
                            .outerRadius(radius)
                            .innerRadius(0);

                var colors = ['#1cacde', '#ffc0cb','#cccccc'];

                var pie = d3.pie();

                function draw(scope, element, attrs) {
                    if (scope.info !== undefined) {
                        var total = scope.info
                                .map(item => item.value) //gets value entry each
                                .reduce((prev, next) => prev + next); //sums all values
                        var pieValues = pie
                            .value(function(d) {
                                return d.value;
                            })(scope.info);
                        // for each pieValue we add a group to hold the arc and the text
                        var arcs = svg
                            .selectAll('path')
                            .data(pieValues)
                            .enter()
                            .append('g')
                                .attr('class', 'slice');
                        // add slice
                        arcs.append('path')
                            .attr('fill', function(d,i) { return colors[i]; })
                            .attr('d', arc)
                            .attr('class', 'slice');
                        //add text label
                        arcs.append('text')
                            .attr('transform', function(d) {//set the label's origin to the center of the arc
                                //we have to make sure to set these before calling arc.centroid
                                d.outerRadius = radius;
                                d.innerRadius = 0;
                                //this gives us a pair of coordinates like [50, 50]
                                return 'translate(' + arc.centroid(d) + ')';
                            })
                            .attr('text-anchor', 'middle')
                            .text(function(d, i) {
                                if (d.value === 0) {
                                    return '';
                                }
                                return (100*d.value/total).toFixed(0) + '%'; }
                            );

                        var labels = svg
                            .append('g')
                            .attr('class','labels');

                        var label= labels
                            .selectAll('text')
                            .data(colors)
                            .enter()
                            .append('g')
                                .attr('class', 'label');
                        label.append('rect')
                            .attr('x',radius+5)
                            .attr('y',function(d,i){return -height/2+lineSpacing*(i+1)-labelSize;})
                            .attr('width',labelSize)
                            .attr('height',labelSize)
                            .attr('fill', function(d,i) { return colors[i]; });
                        label.append('text')
                            .attr('transform', function(d,i) {
                                return 'translate(' + (radius + 25) +',' + (-height/2+lineSpacing*(i+1)) + ')';
                            })
                            .text(function(d, i) { return scope.info[i].name; });
                    }
                }

                // Return the link function
                return function(scope, element, attrs) {
                    scope.$watch('info', function(newVal, oldVal, scope) {

                       // Update the chart
                       draw(scope, element, attrs);
                     }, true);
                };
            }
        };
    };

    angular.module('managementApp')
        .directive('unitGenderInfo', unitGenderInfo)
        .directive('genderChart', ['d3', genderChart])

})();