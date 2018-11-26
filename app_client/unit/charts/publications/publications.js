(function(){
    var unitPublicationsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'unit/charts/publications/template.html'
        };
    };
    var publicationsChart = function (d3) {
        return {
            restrict: 'E',
            scope: {
                info: '=',
            },
            compile: function (element, attrs, transclude ) {
                // Set attributes
                var margin = {top: 20, right: 20, bottom: 30, left: 40},
                    width = 500 - margin.left - margin.right,
                    height = 200 - margin.top - margin.bottom;

                var x = d3.scaleBand()
                          .range([0, width])
                          .padding(0.1);
                var y = d3.scaleLinear()
                          .range([height, 0]);

                var color = '#008080';


                // Create a SVG root element and configure layout
                var svg = d3.select(element[0]).append('svg')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                        .attr('transform',
                              'translate(' + margin.left + ',' + margin.top + ')');

                function draw(scope, element, attrs) {
                    if (scope.info !== undefined) {

                        x.domain(scope.info.map(function(d) { return d.year; }));
                        y.domain([0, d3.max(scope.info, function(d) { return d.value; })]);

                        svg.selectAll('.bar')
                                .data(scope.info)
                            .enter().append('rect')
                                .attr('class', 'bar')
                                .attr('x', function(d) { return x(d.year); })
                                .attr('width', x.bandwidth())
                                .attr('y', function(d) { return y(d.value); })
                                .attr('height', function(d) { return height - y(d.value); })
                                .attr('fill', color);

                        svg.append('g')
                            .attr('transform', 'translate(0,' + height + ')')
                            .call(d3.axisBottom(x));
                        svg.append('g')
                            .call(d3.axisLeft(y));

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
        .directive('unitPublicationsInfo', unitPublicationsInfo)
        .directive('publicationsChart', ['d3', publicationsChart]);

})();