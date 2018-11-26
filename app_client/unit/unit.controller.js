(function(){
/******************************* Controllers **********************************/
    var unitCtrl = function ($scope, $q, $timeout, $mdMedia, $mdPanel,
                            personData, statData, publications, authentication) {
        var vm = this;
        vm.toolbarData = {title: 'Unit statistics and information'};
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.currentUser = authentication.currentUser();

        initializeVariables();

        function initializeVariables() {
            vm.accessPermission = authentication.access('unit');
            // gets user data namely his/her unit
            personData.thisPersonData(vm.currentUser.personID)
                .then(function (response) {
                    vm.thisPerson = response.data.result;
                    var units = [];
                    var unitsID = [];
                    for (var el in vm.thisPerson.lab_data) {
                        if (vm.thisPerson.lab_data[el] !== null &&
                            vm.thisPerson.lab_data[el].unit_id !== null &&
                            unitsID.indexOf(vm.thisPerson.lab_data[el].unit_id) === -1) {
                            units.push({unit_name: vm.thisPerson.lab_data[el].unit,
                                        unit_id: vm.thisPerson.lab_data[el].unit_id,
                            });
                            unitsID.push(vm.thisPerson.lab_data[el].unit_id);
                        }
                    }
                    for (var el in vm.thisPerson.technician_offices) {
                        if (vm.thisPerson.technician_offices[el] !== null &&
                            vm.thisPerson.technician_offices[el].tech_unit_id !== null &&
                            unitsID.indexOf(vm.thisPerson.technician_offices[el].tech_unit_id) === -1) {
                            units.push({unit_name: vm.thisPerson.technician_offices[el].tech_unit_short_name,
                                        unit_id: vm.thisPerson.technician_offices[el].tech_unit_id,
                            });
                            unitsID.push(vm.thisPerson.technician_offices[el].tech_unit_id);
                        }
                    }
                    for (var el in vm.thisPerson.science_manager_offices) {
                        if (vm.thisPerson.science_manager_offices[el] !== null &&
                            vm.thisPerson.science_manager_offices[el].sc_man_unit_id !== null &&
                            unitsID.indexOf(vm.thisPerson.science_manager_offices[el].sc_man_unit_id) === -1) {
                            units.push({unit_name: vm.thisPerson.science_manager_offices[el].sc_man_unit_short_name,
                                        unit_id: vm.thisPerson.science_manager_offices[el].sc_man_unit_id,
                            });
                            unitsID.push(vm.thisPerson.science_manager_offices[el].sc_man_unit_id);
                        }
                    }
                    for (var el in vm.thisPerson.administrative_offices) {
                        if (vm.thisPerson.administrative_offices[el] !== null &&
                            vm.thisPerson.administrative_offices[el].adm_unit_id !== null &&
                            unitsID.indexOf(vm.thisPerson.administrative_offices[el].adm_unit_id) === -1) {
                            units.push({unit_name: vm.thisPerson.administrative_offices[el].adm_unit_short_name,
                                        unit_id: vm.thisPerson.administrative_offices[el].adm_unit_id,
                            });
                            unitsID.push(vm.thisPerson.administrative_offices[el].adm_unit_id);
                        }
                    }
                    getUnitData(units);
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        function getUnitData(units) {
            getGenderData(units);
            getPositionsData(units);
            getPublicationsData(units);
            getPolesData(units);
        }

        function getGenderData(units) {
            var requests = [];
            for (var el in units) {
                if (units[el].unit_id !== undefined) {
                    requests.push(statData.getGenderDistribution(units[el].unit_id));
                }
            }
            $q.all(requests)
            .then(function (results) {
                // first cycles through units
                for (var indUnit in results) {
                    // then cycles throught people in unit
                    var countMales = 0;
                    var countFemales = 0;
                    var countAll = 0;
                    var idPeople = [];
                    for (var indPeople in results[indUnit].data.result) {
                        if (idPeople.indexOf(results[indUnit].data.result[indPeople].id) === -1) {
                            idPeople.push(results[indUnit].data.result[indPeople].id);
                            countAll = countAll + 1;
                            if (results[indUnit].data.result[indPeople].gender === 'F') {
                                countFemales = countFemales + 1;
                            } else if (results[indUnit].data.result[indPeople].gender === 'M') {
                                countMales = countMales + 1;
                            }
                        }
                    }
                    units[indUnit].genderDistribution = [
                            {name: 'Male', value: countMales},
                            {name: 'Female', value: countFemales},
                            {name: 'Unspecified', value: 0},
                        ];
                    units[indUnit].genderDistributionTotal = [
                            {name: 'Male', value: countMales},
                            {name: 'Female', value: countFemales},
                            {name: 'Unspecified', value: countAll-countFemales-countMales},
                        ];
                }
                vm.units = units;
            });
        }
        function getPositionsData(units) {
            var requests = [];
            for (var el in units) {
                if (units[el].unit_id !== undefined) {
                    requests.push(statData.getPositionsDistribution(units[el].unit_id));
                }
            }
            personData.labPositions()
            .then(function (response) {
                vm.labPositions = response.data.result;
                var original_categories = {};
                for (var id in vm.labPositions) {
                    vm.labPositions[id].value = 0;
                    original_categories[vm.labPositions[id].lab_position_id] = Object.assign({}, vm.labPositions[id]);
                }
                original_categories['Unspecified'] = {name_en: 'Unspecified', value: 0};
                $q.all(requests)
                .then(function (results) {
                    // first cycles through units
                    for (var indUnit in results) {
                        // then cycles throught people in unit

                        // Attention this copy of categories, only work fine if original_categories
                        // has no Dates, etc.
                        var categories = JSON.parse(JSON.stringify(original_categories));
                        var countAll = 0;
                        var idPeople = [];
                        for (var indPeople in results[indUnit].data.result) {
                            if (idPeople.indexOf(results[indUnit].data.result[indPeople].id) === -1) {
                                idPeople.push(results[indUnit].data.result[indPeople].id);
                                countAll = countAll + 1;
                                var positionID = results[indUnit].data.result[indPeople].lab_position_id;
                                if (positionID === null) { positionID = 'Unspecified';}
                                categories[positionID].value = categories[positionID].value + 1;
                            }
                        }
                        var positionsDistribution = [];
                        for (var keyCat in categories) {
                            categories[keyCat].name = categories[keyCat].name_en;
                            positionsDistribution.push(categories[keyCat]);
                        }
                        positionsDistribution.sort(function (a, b) {
                            return a.sort_order - b.sort_order;
                        });
                        units[indUnit].positionsDistribution = positionsDistribution;
                    }
                    vm.units = units;
                });
            });
        }
        function getPublicationsData(units) {
            var requests = [];
            for (var el in units) {
                if (units[el].unit_id !== undefined) {
                    requests.push(statData.getPublicationsByYear(units[el].unit_id));
                }
            }
            $q.all(requests)
            .then(function (results) {
                // first cycles through units
                for (var indUnit in results) {
                    // gets minimum and maximum year from publications list
                    var minYear = 9999;
                    var maxYear = 0;
                    var data = results[indUnit].data.result;
                    for (var el in data) {
                        if (Number.isInteger(data[el].year)) {
                            if (data[el].year > maxYear) { maxYear = data[el].year; }
                            if (data[el].year < minYear) { minYear = data[el].year; }
                        }
                    }
                    var categories = {};
                    for (var year = minYear; year <= maxYear; year++) {
                        categories[year] = {year: year, value: 0};
                    }
                    // then cycles through publications
                    var idPublication = [];
                    for (var indPub in data) {
                        if (data[indPub].year !== null) {
                            if (idPublication.indexOf(data[indPub].id) === -1) {
                                idPublication.push(data[indPub].id);
                                categories[data[indPub].year].value = categories[data[indPub].year].value + 1;
                            }
                        }
                    }
                    var publicationsByYear = [];
                    for (var keyCat in categories) {
                        publicationsByYear.push(categories[keyCat]);
                    }
                    publicationsByYear.sort(function (a, b) {
                        return a.year - b.year;
                    });
                    units[indUnit].publicationsByYear = publicationsByYear;
                }
                vm.units = units;
            });
        }
        function getPolesData(units) {
            var requests = [];
            for (var el in units) {
                if (units[el].unit_id !== undefined) {
                    requests.push(statData.getPoleDistribution(units[el].unit_id));
                }
            }
            personData.institutionCities()
            .then(function (response) {
                vm.institutionCities = response.data.result;

                var original_categories = {};
                for (var id in vm.institutionCities) {
                    vm.institutionCities[id].value = 0;
                    original_categories[vm.institutionCities[id].id] = Object.assign({}, vm.institutionCities[id]);
                }
                original_categories['Unspecified'] = {city: 'Unspecified', value: 0};
                $q.all(requests)
                .then(function (results) {
                    // first cycles through units
                    for (var indUnit in results) {
                        // then cycles throught people in unit

                        // Attention this copy of categories, only work fine if original_categories
                        // has no Dates, etc.
                        var categories = JSON.parse(JSON.stringify(original_categories));
                        var countAll = 0;
                        var idPeople = [];
                        for (var indPeople in results[indUnit].data.result) {
                            if (idPeople.indexOf(results[indUnit].data.result[indPeople].id) === -1) {
                                idPeople.push(results[indUnit].data.result[indPeople].id);
                                countAll = countAll + 1;
                                var poleID = results[indUnit].data.result[indPeople].city_id;
                                if (poleID === null) { poleID = 'Unspecified';}
                                categories[poleID].value = categories[poleID].value + 1;
                            }
                        }
                        var polesDistribution = [];
                        for (var keyCat in categories) {
                            categories[keyCat].name = categories[keyCat].city;
                            polesDistribution.push(categories[keyCat]);
                        }
                        units[indUnit].polesDistribution = polesDistribution;
                    }
                    vm.units = units;
                });
            });
        }
    };

/******************************** Directives **********************************/

/**************************** Register components *****************************/
    angular.module('managementApp')

        .controller('unitCtrl', unitCtrl)
        ;
})();