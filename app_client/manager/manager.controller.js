(function(){

/******************************* Controllers **********************************/
    var managerCtrl = function ($scope, $timeout, $mdMedia, Upload,
                        personData, teamData, managerData, publications, authentication) {
        var GLOBAL_MANAGER_PERMISSION = 5;
        var vm = this;

        vm.toolbarData = {title: 'Consult and change user data'};
        vm.isLoggedIn = authentication.isLoggedIn();

        vm.photoSize = {w: 196, h: 196};
        vm.aspectRatio = (vm.photoSize.w*1.0)/(vm.photoSize.h*1.0);
        vm.loadingAllPeople = true;

        // initialize variables
        initializeDetails();
        initializeVariables();

        if (vm.accessPermission) {
            personData.institutionCities()
                .then(function (response) {
                    vm.institutionCities = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.degreeTypes()
                .then(function (response) {
                    vm.degreeTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.supervisorTypes()
                .then(function (response) {
                    vm.supervisorTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.professionalSituations()
                .then(function (response) {
                    vm.professionalSituations = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.professionalCategories()
                .then(function (response) {
                    vm.professionalCategories = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.fellowshipTypes()
                .then(function (response) {
                    vm.fellowshipTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.fundingAgencies()
                .then(function (response) {
                    vm.fundingAgencies = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.managementEntities()
                .then(function (response) {
                    vm.managementEntities = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.labPositions()
                .then(function (response) {
                    vm.labPositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.departments()
                .then(function (response) {
                    vm.departments = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.units()
                .then(function (response) {
                    var units_temp = response.data.result;
                    var units = [];
                    var usedIDs = [];
                    for (var el in units_temp) {
                        if (usedIDs.indexOf(units_temp[el].id) === -1) {
                            usedIDs.push(units_temp[el].id);
                            units.push(units_temp[el]);
                        }
                    }
                    vm.units = units;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.groups()
                .then(function (response) {
                    vm.groups = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.labs()
                .then(function (response) {
                    var res = response.data.result;
                    // expands results
                    vm.labs = [];
                    var labRow = 0;
                    for (var ind in res) {
                        for (var indHist in res[ind].lab_history) {
                            labRow++;
                            vm.labs.push({
                                lab_row: labRow,
                                lab_id: res[ind].lab_id,
                                lab: res[ind].lab,
                                lab_opened: res[ind].lab_opened,
                                lab_closed: res[ind].lab_closed,
                                group_id: res[ind].lab_history[indHist].group_id,
                                group_name: res[ind].lab_history[indHist].group_name,
                                labs_groups_valid_from: processDate(res[ind].lab_history[indHist].labs_groups_valid_from),
                                labs_groups_valid_until: processDate(res[ind].lab_history[indHist].labs_groups_valid_until),
                                unit_id: res[ind].lab_history[indHist].unit_id
                            });
                        }
                    }
                    getAllPeopleWithRoles();
                    getAllPeopleNoRoles();
                    getAllPeopleToValidate();

                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.costCenters()
                .then(function (response) {
                    vm.costCenters = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.facilities()
                .then(function (response) {
                    vm.facilities = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.technicianPositions()
                .then(function (response) {
                    vm.technicianPositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.scienceManagementOffices()
                .then(function (response) {
                    vm.scienceManagementOffices = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.scienceManagementPositions()
                .then(function (response) {
                    vm.scienceManagementPositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.administrativeOffices()
                .then(function (response) {
                    vm.administrativeOffices = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.administrativePositions()
                .then(function (response) {
                    vm.administrativePositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.roles()
                .then(function (response) {
                    vm.roles = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.cardTypes()
                .then(function (response) {
                    vm.cardTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.permissions()
                .then(function (response) {
                    var data = response.data.result;
                    var newData = [];
                    if (vm.currentUser.stat > GLOBAL_MANAGER_PERMISSION) {
                        for (var ind in data) {
                            if (data[ind].permissions_id >= vm.currentUser.stat) {
                                newData.push(data[ind]);
                            }
                        }
                        vm.permissions = newData;
                    } else {
                        vm.permissions = data;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        vm.roleName = function (rID) {
            for (var ind in vm.roles) {
                if (vm.roles[ind].role_id === rID) {
                    return vm.roles[ind].name_en;
                }
            }
            return '';
        };
        vm.showTable = function () {
            return $mdMedia('min-width: 1440px');
        };
        vm.updateDataSubmit = function (rowID, updatedRow, updObj, delArrObj) {
            var uRow = Object.assign({}, updatedRow);
            var rowExists = false;
            for (var el in vm[updObj]) {
                if (vm[updObj][el]['row_id'] === rowID) {
                    rowExists = true;
                    vm[updObj][el] = uRow;
                }
            }
            if (!rowExists) {
                vm[updObj].push(uRow);
            }
            for (var ind in delArrObj) {
                for (var el in vm[delArrObj[ind]]) {
                    if (vm[delArrObj[ind]][el]['row_id'] === rowID) {
                        vm[delArrObj[ind]].splice(el,1);
                    }
                }
            }

        };
        vm.changeLab = function (lab, rowID) {
            // only change "update array"
            for (var el in vm.currPeople) {
                if (vm.currPeople[el]['row_id'] == rowID) {
                    var num = el;
                    break;
                }
            }
            //finds group_id associated with new lab
            for (var l in vm.labs) {
                if (vm.labs[l]['lab_row'] == lab) {
                    var newLab = vm.labs[l]['lab_id'];
                    var newGroup = vm.labs[l]['group_id'];
                    var newUnit = vm.labs[l]['unit_id'];
                    vm.currPeople[num]['lab_id'] = newLab;
                    vm.currPeople[num]['group_id'] = newGroup;
                    vm.currPeople[num]['unit_id'] = newUnit;
                    vm.updateDataSubmit(rowID,vm.currPeople[num],'updateLabPerson', []);
                }
            }
        };
        vm.labNames = function(lab) {
            //console.log(lab)
            if (lab !== undefined) {
                var name = lab.lab + '@' + lab.group_name;
                return name;
            }
            return '';
        };
        vm.changeSituation = function (situation){
            for (var ind in vm.professionalSituations) {
                if (vm.professionalSituations[ind].id === situation['job_situation_id']) {
                    situation['job_situation_name_en'] = vm.professionalSituations[ind].name_en;
                    situation['job_situation_requires_unit_contract'] = vm.professionalSituations[ind].requires_unit_contract;
                    situation['job_situation_requires_fellowship'] = vm.professionalSituations[ind].requires_fellowship;
                    break;
                }
            }
        };
        vm.changeCategory = function (category){
            for (var ind in vm.professionalCategories) {
                if (vm.professionalCategories[ind].id === category['job_category_id']) {
                    category['job_category_name_en'] = vm.professionalCategories[ind].name_en;
                    break;
                }
            }
        };
        vm.changeFacility = function (facility, member, rowID) {
            vm.updateDataSubmit(rowID, member,'updateTechPerson', []);
        };
        vm.changeManageOffice = function (office, member, rowID) {
            vm.updateDataSubmit(rowID, member,'updateManagePerson', []);
        };
        vm.changeAdmOffice = function (office, member, rowID) {
            vm.updateDataSubmit(rowID, member,'updateAdmPerson', []);
        };
        vm.renderPeople = function (str, noRoles) {
            if (str === 'new') {
                vm.currentPage = 1;
            }
            if (noRoles === undefined) {
                noRoles = false;
            }
            var toInclude = 0;
            var toIncludeDueName = 0;
            var toIncludeDueUnit = 0;
            var toIncludeDueGroup = 0;
            var toIncludeDueLab = 0;
            var toIncludeDueDate = 0;
            var toIncludeDueRole = 0;
            if (noRoles) {
                vm.totalPeopleNoRoles = vm.allPeopleNoRoles.length;
                vm.selectedPeopleNoRoles = [];
                for (var member in vm.allPeopleNoRoles) {
                    toInclude = 0;
                    toIncludeDueName = 0;
                    if (vm.searchName !== '') {
                        if (nameMatching(vm.allPeopleNoRoles[member]['person_name'],vm.searchName) !== null) {
                           toIncludeDueName = 1;
                        }
                    } else {
                        toIncludeDueName = 1;
                    }
                    toInclude = toIncludeDueName;
                    if (toInclude === 1) {
                        vm.selectedPeopleNoRoles.push(vm.allPeopleNoRoles[member]);
                    }
                }
                vm.totalFromSearchNoRoles = vm.selectedPeopleNoRoles.length;
                vm.totalPagesNoRoles = Math.ceil(vm.totalFromSearchNoRoles / vm.pageSizeNoRoles);
                vm.pagesNoRoles = [];
                for (var num=1; num<=vm.totalPagesNoRoles; num++) {
                    vm.pagesNoRoles.push(num);
                }
                // Sort selectedPeopleNoRoles according to defined order, before
                // defining page contents
                vm.selectedPeopleNoRoles = vm.selectedPeopleNoRoles.sort(sorter);
                vm.currPeopleNoRoles = [];
                for (var member = (vm.currentPageNoRoles - 1) * vm.pageSizeNoRoles;
                        member < vm.currentPageNoRoles * vm.pageSizeNoRoles
                        && member < vm.totalFromSearchNoRoles;
                        member++) {

                    vm.currPeopleNoRoles.push(Object.assign({}, vm.selectedPeopleNoRoles[member]));
                }

            } else {
                vm.totalPeople = vm.allPeople.length;
                // now we filter based on search terms
                vm.selectedPeople = [];

                for (var member in vm.allPeople) {
                    toInclude = 0;
                    toIncludeDueName = 0;
                    toIncludeDueUnit = 0;
                    toIncludeDueGroup = 0;
                    toIncludeDueLab = 0;
                    toIncludeDueDate = 0;
                    toIncludeDueRole = 0;
                    if (vm.searchName !== '') {
                        if (nameMatching(vm.allPeople[member]['person_name'],vm.searchName) !== null) {
                           toIncludeDueName = 1;
                        }
                    } else {
                        toIncludeDueName = 1;
                    }
                    if (vm.searchUnit !== '') {
                        if (vm.allPeople[member]['unit_id'] === vm.searchUnit) {
                            toIncludeDueUnit = 1;
                        }
                    } else {
                        toIncludeDueUnit = 1;
                    }
                    if (vm.searchGroup !== '') {
                        if (vm.allPeople[member]['group_id'] === vm.searchGroup) {
                            toIncludeDueGroup = 1;
                        }
                    } else {
                        toIncludeDueGroup = 1;
                    }
                    if (vm.searchLab !== '' && vm.allPeople[member]['lab'] !== null) {
                        if (nameMatching(vm.allPeople[member]['lab'],vm.searchLab) !== null) {
                            toIncludeDueLab = 1;
                        }
                    } else {
                        if (vm.searchLab !== '' && vm.allPeople[member]['lab'] === null) {
                            toIncludeDueLab = 0;
                        } else {
                            toIncludeDueLab = 1;
                        }
                    }
                    if (vm.searchRole !== '') {
                        if (vm.allPeople[member]['role_id'] === vm.searchRole) {
                            toIncludeDueRole = 1;
                        }
                    } else {
                        toIncludeDueRole = 1;
                    }
                    if (vm.searchActiveDate !== null) {
                        if (vm.allPeople[member]['valid_until'] !== null && vm.allPeople[member]['valid_from'] !== null) {
                            if (moment(vm.allPeople[member]['valid_until']).isAfter(moment(vm.searchActiveDate))
                                    && moment(vm.allPeople[member]['valid_from']).isBefore(moment(vm.searchActiveDate))) {
                                toIncludeDueDate = 1;
                            }

                        } else if (vm.allPeople[member]['valid_until'] === null && vm.allPeople[member]['valid_from'] !== null) {
                            if (moment(vm.allPeople[member]['valid_from']).isBefore(moment(vm.searchActiveDate))) {
                                toIncludeDueDate = 1;
                            }
                        } else if (vm.allPeople[member]['valid_until'] !== null && vm.allPeople[member]['valid_from'] === null) {
                            if (moment(vm.allPeople[member]['valid_until']).isAfter(moment(vm.searchActiveDate))) {
                                toIncludeDueDate = 1;
                            }
                        } else {
                            toIncludeDueDate = 1;
                        }
                    } else {
                        toIncludeDueDate = 1;
                    }
                    toInclude = toIncludeDueName * toIncludeDueUnit
                                * toIncludeDueGroup * toIncludeDueLab
                                * toIncludeDueRole * toIncludeDueDate;
                    if (toInclude === 1) {
                        vm.selectedPeople.push(vm.allPeople[member]);
                    }

                }
                vm.totalFromSearch = vm.selectedPeople.length;
                vm.totalPages = Math.ceil(vm.totalFromSearch / vm.pageSize);
                vm.pages = [];
                for (var num=1; num<=vm.totalPages; num++) {
                    vm.pages.push(num);
                }
                // Sort selectedPeople according to defined order, before
                // defining page contents
                vm.selectedPeople = vm.selectedPeople.sort(sorter);
                vm.currPeople = [];
                for (var member = (vm.currentPage - 1) * vm.pageSize;
                        member < vm.currentPage * vm.pageSize && member < vm.totalFromSearch;
                        member++) {
                    vm.selectedPeople[member]['valid_from'] = processDate(vm.selectedPeople[member]['valid_from']);
                    vm.selectedPeople[member]['labs_groups_valid_from'] = processDate(vm.selectedPeople[member]['labs_groups_valid_from']);
                    vm.selectedPeople[member]['valid_until'] = processDate(vm.selectedPeople[member]['valid_until']);
                    vm.selectedPeople[member]['labs_groups_valid_until'] = processDate(vm.selectedPeople[member]['labs_groups_valid_until']);
                    vm.currPeople.push(Object.assign({}, vm.selectedPeople[member]));
                }
            }
        };
        vm.renderPeopleValidate = function (str) {
            if (str === 'new') {
                vm.currentPageValidate = 1;
            }
            var toInclude = 0;
            var toIncludeDueName = 0;
            vm.totalPeopleValidate = vm.allPeopleValidate.length;
            // now we filter based on search terms
            vm.selectedPeopleValidate = [];

            for (var member in vm.allPeopleValidate) {
                toInclude = 0;
                toIncludeDueName = 0;
                if (vm.searchNameValidate !== '') {
                    if (nameMatching(vm.allPeopleValidate[member]['person_name'],vm.searchNameValidate) !== null) {
                       toIncludeDueName = 1;
                    }
                } else {
                    toIncludeDueName = 1;
                }

                toInclude = toIncludeDueName;
                if (toInclude === 1) {
                    vm.selectedPeopleValidate.push(vm.allPeopleValidate[member]);
                }

            }
            vm.totalFromSearchValidate = vm.selectedPeopleValidate.length;
            vm.totalPagesValidate = Math.ceil(vm.totalFromSearchValidate / vm.pageSizeValidate);
            vm.pagesValidate = [];
            for (var num=1; num<=vm.totalPagesValidate; num++) {
                vm.pagesValidate.push(num);
            }
            // Sort selectedPeople according to defined order, before
            // defining page contents
            vm.selectedPeopleValidate = vm.selectedPeopleValidate.sort(sorter);
            vm.currPeopleValidate = [];
            for (var member = (vm.currentPageValidate - 1) * vm.pageSizeValidate;
                    member < vm.currentPageValidate * vm.pageSizeValidate && member < vm.totalFromSearchValidate;
                    member++) {
                vm.selectedPeopleValidate[member]['valid_from'] = processDate(vm.selectedPeopleValidate[member]['valid_from']);
                vm.selectedPeopleValidate[member]['valid_until'] = processDate(vm.selectedPeopleValidate[member]['valid_until']);
                vm.currPeopleValidate.push(Object.assign({}, vm.selectedPeopleValidate[member]));
            }
        };

        vm.sortColumn = function(colName, noRoles) {
            if (noRoles === undefined) {
                noRoles = false;
            }
            if (colName === vm.sortType) {
                vm.sortReverse = !vm.sortReverse;
            } else {
                vm.sortType = colName;
                vm.sortReverse = false;
            }
            vm.renderPeople('new', noRoles);
        };
        vm.showDetailsPerson = function (member, noRoles) {
            if (noRoles === undefined) {
                noRoles = false;
            }
            if (vm.nameDetails.indexOf(member.person_name) === -1) {
                vm.nameDetails.push(member.person_name);
                vm.thisPerson.push({});
                vm.hasPersonalEmail.push(false);
                vm.selectedNationalities.push([]);
                vm.currentIDs.push([]);
                vm.currentCars.push([]);

                vm.newAuthorNames.push([]);
                vm.delAuthorNames.push([]);

                vm.hasPhoto.push(false);
                vm.changePhoto.push(false);
                vm.imagePersonPre.push('');
                vm.imagePerson.push('');
                vm.imagePersonCropped.push('');
                vm.imageTemp.push('');
                vm.personImageType.push('');
                var sizeImagePersonPre = vm.imagePersonPre.length;
                vm.watchImage.push($scope.$watch(
                    function () {
                        return vm.imagePersonPre[sizeImagePersonPre-1]["$ngfBlobUrl"];
                    },
                    function(newValue, oldValue, scope) {
                        vm.imagePerson[sizeImagePersonPre-1] = newValue;
                        vm.personImageType[sizeImagePersonPre-1] = vm.imagePersonPre[sizeImagePersonPre-1].type;
                    }, true)
                );
                vm.currentFCTStatus.push([]);
                vm.currentFinishedDegrees.push([]);
                vm.initialFinishedDegrees.push([]);
                vm.currentOngoingDegrees.push([]);
                vm.initialOngoingDegrees.push([]);
                vm.currentEmergencyContacts.push([]);
                vm.currentAffiliationsLab.push([]);
                vm.currentCostCenters.push([]);
                vm.currentAffiliationsTech.push([]);
                vm.currentAffiliationsScMan.push([]);
                vm.currentAffiliationsAdm.push([]);
                vm.currentAffiliationsDepartment.push([]);
                vm.currentRoles.push([]);
                vm.currentResponsibles.push([]);
                getPersonData(member.person_id, -1, -1);
            }
        };
        vm.showDetailsPersonValidate = function (member) {
            if (vm.nameDetailsValidate.indexOf(member.person_name) === -1) {
                vm.nameDetailsValidate.push(member.person_name);
                vm.thisPersonValidate.push({});
                vm.selectedNationalitiesValidate.push([]);
                vm.currentIDsValidate.push([]);
                vm.currentCarsValidate.push([]);
                vm.hasPersonalEmailValidate.push(false);
                vm.hasPhotoValidate.push(false);
                vm.changePhotoValidate.push(false);
                vm.imagePersonPreValidate.push('');
                vm.imagePersonValidate.push('');
                vm.imagePersonCroppedValidate.push('');
                vm.imageTempValidate.push('');
                vm.personImageTypeValidate.push('');
                var sizeImagePersonPre = vm.imagePersonPreValidate.length;
                vm.watchImageValidate.push($scope.$watch(
                    function () {
                        return vm.imagePersonPreValidate[sizeImagePersonPre-1]["$ngfBlobUrl"];
                    },
                    function(newValue, oldValue, scope) {
                        vm.imagePersonValidate[sizeImagePersonPre-1] = newValue;
                        vm.personImageTypeValidate[sizeImagePersonPre-1] = vm.imagePersonPreValidate[sizeImagePersonPre-1].type;
                    }, true)
                );
                vm.currentFCTStatusValidate.push([]);
                vm.currentFinishedDegreesValidate.push([]);
                vm.initialFinishedDegreesValidate.push([]);
                vm.currentOngoingDegreesValidate.push([]);
                vm.initialOngoingDegreesValidate.push([]);
                vm.currentEmergencyContactsValidate.push([]);
                vm.currentAffiliationsLabValidate.push([]);
                vm.currentAffiliationsTechValidate.push([]);
                vm.currentAffiliationsScManValidate.push([]);
                vm.currentAffiliationsAdmValidate.push([]);
                vm.currentAffiliationsDepartmentValidate.push([]);
                vm.currentRolesValidate.push([]);
                vm.currentResponsiblesValidate.push([]);
                getPersonDataValidate(member.person_id, -1, -1);
            }
        };
        vm.addAuthorName = function (indDetail,chip) {
            for (var el in vm.thisPerson[indDetail].author_data) {
                if (typeof vm.thisPerson[indDetail].author_data[el] === 'string') {
                    vm.thisPerson[indDetail].author_data[el] = {};
                    vm.thisPerson[indDetail].author_data[el].author_name = chip;
                    vm.thisPerson[indDetail].author_data[el].author_name_id = 'new';
                    vm.newAuthorNames[indDetail].push(vm.thisPerson[indDetail].author_data[el]);
                    break;
                }
            }
        };
        vm.removeAuthorName = function (indDetail,chip) {
            var toRemove = true;
            for (var el in vm.newAuthorNames[indDetail]) {
               if (vm.newAuthorNames[indDetail][el].author_name_id === 'new'
                        && vm.newAuthorNames[indDetail][el].author_name === chip.author_name) {
                    vm.newAuthorNames[indDetail].splice(el,1);
                    toRemove = false;
                    break;
                }
            }
            if (toRemove) vm.delAuthorNames[indDetail].push(chip);

        };

        vm.changePhotoAction = function (ind, validate) {
            if (validate !== true) {
                vm.changePhoto[ind] = true;
            } else {
                vm.changePhotoValidate[ind] = true;
            }
        };

        vm.deleteRole = function (role, ind, indDetail) {
            if (role === 'researcher') {
                if (vm.thisPerson[indDetail].lab_data.length > 1) {
                    alert('Please remove your associations to labs first');
                    return false;
                } else if (vm.thisPerson[indDetail].lab_data.length === 1) {
                    if (vm.thisPerson[indDetail].lab_data[0].lab_id !== null
                           && vm.thisPerson[indDetail].lab_data[0].lab_id !== 'new') {
                        alert('Please remove your associations to labs first');
                        return false;
                    }
                }
            }
            if (role === 'technician') {
                if (vm.thisPerson[indDetail].technician_offices.length > 1) {
                    alert('Please remove your associations to facilities first');
                    return false;
                } else if (vm.thisPerson[indDetail].technician_offices.length === 1) {
                    if (vm.thisPerson[indDetail].technician_offices[0].tech_id !== null
                           && vm.thisPerson[indDetail].technician_offices[0].tech_id !== 'new') {
                        alert('Please remove your associations to facilities first');
                        return false;
                    }
                }
            }
            if (role === 'scienceManager') {
                if (vm.thisPerson[indDetail].science_manager_offices.length > 1) {
                    alert('Please remove your associations to offices first');
                    return false;
                } else if (vm.thisPerson[indDetail].science_manager_offices.length === 1) {
                    if (vm.thisPerson[indDetail].science_manager_offices[0].sc_man_id !== null
                           && vm.thisPerson[indDetail].science_manager_offices[0].sc_man_id !== 'new') {
                        alert('Please remove your associations to offices first');
                        return false;
                    }
                }
            }
            if (role === 'administrative') {
                if (vm.thisPerson[indDetail].administrative_offices.length > 1) {
                    alert('Please remove your associations to offices first');
                    return false;
                } else if (vm.thisPerson[indDetail].administrative_offices.length === 1) {
                    if (vm.thisPerson[indDetail].administrative_offices[0].adm_id !== null
                           && vm.thisPerson[indDetail].administrative_offices[0].adm_id !== 'new') {
                        alert('Please remove your associations to offices first');
                        return false;
                    }
                }
            }
            vm.updateStatus[ind] = "Deleting...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var dataDelete;
            for (var indRole in vm.thisPerson[indDetail].roles_data) {
                if (vm.thisPerson[indDetail].roles_data[indRole].people_roles_id !== null) {
                    if (vm.thisPerson[indDetail].roles_data[indRole].role_id === 1
                            && role === 'researcher') {
                        dataDelete = {
                            "people_roles_id": vm.thisPerson[indDetail].roles_data[indRole].people_roles_id,
                            "researcher_data": vm.thisPerson[indDetail].researcher_data,
                            "lab_data": vm.thisPerson[indDetail].lab_data
                        };
                    }
                    if (vm.thisPerson[indDetail].roles_data[indRole].role_id === 2
                            && role === 'technician') {
                        dataDelete = {
                            "people_roles_id": vm.thisPerson[indDetail].roles_data[indRole].people_roles_id,
                            "technician_data": vm.thisPerson[indDetail].technician_data,
                            "technician_offices": vm.thisPerson[indDetail].technician_offices
                        };
                    }
                    if (vm.thisPerson[indDetail].roles_data[indRole].role_id === 3
                            && role === 'scienceManager') {
                        dataDelete = {
                            "people_roles_id": vm.thisPerson[indDetail].roles_data[indRole].people_roles_id,
                            "science_manager_data": vm.thisPerson[indDetail].science_manager_data,
                            "science_manager_offices": vm.thisPerson[indDetail].science_manager_offices
                        };
                    }
                    if (vm.thisPerson[indDetail].roles_data[indRole].role_id === 4
                            && role === 'administrative') {
                        dataDelete = {
                            "people_roles_id": vm.thisPerson[indDetail].roles_data[indRole].people_roles_id,
                            "administrative_data": vm.thisPerson[indDetail].administrative_data,
                            "administrative_offices": vm.thisPerson[indDetail].administrative_offices
                        };
                    }
                }
            }
            if (dataDelete !== undefined) {
                if (Object.keys(dataDelete).length !== 0) {
                    personData.deleteRolePersonByID(role, vm.thisPerson[indDetail].id, dataDelete)
                        .then( function () {
                            getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                            getAllPeopleWithRoles(ind);
                        },
                        function () {
                            vm.updateStatus[ind] = "Error!";
                            vm.messageType[ind] = 'message-error';
                        },
                        function () {}
                        );
                } else {
                    getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                }
            } else {
                getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
            }
            return false;
        };

        vm.exportSpreadsheet = function() {
            var type = 'xlsx';
            var wsName = 'Data';
            var wb = {};
            var selectedPeople = convertData(vm.selectedPeople);
            var ws = XLSX.utils.json_to_sheet(selectedPeople);
            wb.SheetNames = [wsName];
            wb.Sheets = {};
            wb.Sheets[wsName] = ws;
            var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
            var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
            var fname = 'manager_people_with_roles_' + dateTime + '.' + type;
            try {
            	saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), fname);
            } catch(e) { if(typeof console != 'undefined') console.log(e, wbout); }
        };

        vm.submitAllPeople = function () {
            var ind = vm.forms['allPeople'];
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                updateLabPerson: vm.updateLabPerson,
                updateTechPerson: vm.updateTechPerson,
                updateManagePerson: vm.updateManagePerson,
                updateAdmPerson: vm.updateAdmPerson,
                deleteNeverMember: vm.deleteNeverMember,
                changed_by: vm.currentUser.userID
            };
            managerData.updatePeopleData(data)
                .then(function () {
                        vm.currPeople = [];
                        getAllPeopleWithRoles(ind);
                        initializeDetails();
                        initializeVariables(ind);
                    },
                    function (res) {
                        if (res.status === 304) {
                            vm.updateStatus[ind] = "No changes!";
                            vm.messageType[ind] = 'message-error';
                            vm.hideMessage[ind] = false;
                            $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                        } else {
                            vm.updateStatus[ind] = "Error!";
                            vm.messageType[ind] = 'message-error';
                        }
                    },
                    function () {}
                );
            return false;
        };
        vm.rolePresent = function (roleList, role) {
            for (var ind in roleList) {
                if (roleList[ind].name_en === role) return true;
            }
            return false;
        };

        vm.sendAdditionEmail = function (ind, indDetail, datum, stat, validate) {
            vm.updateStatus[ind] = "Sending mail";
            vm.hideMessage[ind] = false;
            var data = stat;
            var unit_name = '';
            for (var unit in vm.units) {
                if (vm.units[unit].id === stat.unit_id) {
                    unit_name = vm.units[unit].short_name + ' - ' + vm.units[unit].name;
                }
            }
            data['unit_name'] = unit_name;
            data['person_details'] = datum;
            managerData.sendAdditionEmail(datum.id, data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function (error) {
                    vm.updateStatus[ind] = "Error! Contact admin." + error.data.status;
                    vm.messageType[ind] = 'message-error';
                    vm.hideMessage[ind] = false;
                    $timeout(function () {
                        vm.hideMessage[ind] = true;
                        if (validate === true) {
                            getPersonDataValidate(datum.id, indDetail, ind);
                        } else {
                            getPersonData(datum.id, indDetail, ind);
                        }
                    }, 10000);
                },
                function () {}
                );
            return false;
        };
        vm.sendRemovalEmail = function (ind, indDetail, datum, stat, validate) {
            vm.updateStatus[ind] = "Sending mail";
            vm.hideMessage[ind] = false;
            var data = stat;
            var unit_name = '';
            for (var unit in vm.units) {
                if (vm.units[unit].id === stat.unit_id) {
                    unit_name = vm.units[unit].short_name + ' - ' + vm.units[unit].name;
                }
            }
            data['unit_name'] = unit_name;
            data['person_details'] = datum;
            managerData.sendRemovalEmail(datum.id, data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function (error) {
                    vm.updateStatus[ind] = "Error! Contact admin." + error.data.status;
                    vm.messageType[ind] = 'message-error';
                    vm.hideMessage[ind] = false;
                    $timeout(function () {
                        vm.hideMessage[ind] = true;
                        if (validate === true) {
                            getPersonDataValidate(datum.id, indDetail, ind);
                        } else {
                            getPersonData(datum.id, indDetail, ind);
                        }
                    }, 10000);
                },
                function () {}
                );
            return false;
        };
        vm.submitFCTStatus = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating 'Belongs'/'Removed' ";
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentFCTStatusValidate[indDetail],datum.status_fct,
                                  'status_fct_id', 'newStatusFCT','updateStatusFCT','deleteStatusFCT');
            } else {
                data = processDataRows(vm.currentFCTStatus[indDetail],datum.status_fct,
                                  'status_fct_id', 'newStatusFCT','updateStatusFCT','deleteStatusFCT');
            }
            data['person_details'] = datum;
            managerData.updateStatusFCT(datum.id, data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function (error) {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                    vm.hideMessage[ind] = false;
                    $timeout(function () {
                        vm.hideMessage[ind] = true;
                        if (validate === true) {
                            getPersonDataValidate(datum.id, indDetail, ind);
                        } else {
                            getPersonData(datum.id, indDetail, ind);
                        }
                    }, 10000);
                },
                function () {}
                );
            return false;
        };

        vm.submitPasswordReset = function (ind, indDetail, datum) {
            vm.updateStatus[ind] = "Reseting...";
            vm.hideMessage[ind] = false;
            var data = {
                "user_id": datum.user_id,
                "city_id": datum.institution_city_id,
                "password": datum.password
            };
            managerData.passwordResetByID(datum.id,data)
                .then( function () {
                    getPersonData(datum.id, indDetail, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitUserPermissions = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "user_id": datum.user_id,
                "city_id": datum.institution_city_id,
                "permissions": datum.permissions,
                "username": datum.username
            };
            managerData.changeUserPermissions(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitPersonPhoto = function (ind, indDetail, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            if (validate !== true) {
                Upload.urlToBlob(vm.imagePersonCropped[indDetail])
                    .then(function(blob) {
                        var croppedImagePre = blob;
                        var croppedImageFile = new File([croppedImagePre],
                                vm.imagePersonPre[indDetail].name, {type: vm.personImageType[indDetail]});
                        var data = {
                            file: croppedImageFile
                        };
                        personData.updatePersonPhoto(vm.thisPerson[indDetail].id,1, data)
                            .then( function () {
                                getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                                vm.changePhoto[indDetail] = false;
                            },
                            function () {
                                vm.updateStatus[ind] = "Error!";
                                vm.messageType[ind] = 'message-error';
                            },
                            function () {}
                            );
                        return false;

                    });
            } else {
                Upload.urlToBlob(vm.imagePersonCroppedValidate[indDetail])
                    .then(function(blob) {
                        var croppedImagePre = blob;
                        var croppedImageFile = new File([croppedImagePre],
                                vm.imagePersonPreValidate[indDetail].name, {type: vm.personImageTypeValidate[indDetail]});
                        var data = {
                            file: croppedImageFile
                        };
                        personData.updatePersonPhoto(vm.thisPersonValidate[indDetail].id,1, data)
                            .then( function () {
                                getPersonDataValidate(vm.thisPersonValidate[indDetail].id, indDetail, ind);
                                vm.changePhotoValidate[indDetail] = false;
                            },
                            function () {
                                vm.updateStatus[ind] = "Error!";
                                vm.messageType[ind] = 'message-error';
                            },
                            function () {}
                            );
                        return false;

                    });
            }
        };
        vm.submitNuclearInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.hideMessage[ind] = false;
            var processNat = processNationalities(indDetail, datum, validate);
            var data = {
                "name": datum.name,
                "colloquial_name": datum.colloquial_name,
                "birth_date": datum.birth_date,
                "gender": datum.gender,
                "new_nationalities": processNat.newNationalities,
                "del_nationalities": processNat.deleteNationalities,
                "user_id": datum.user_id,
                "active_from": datum.active_from,
                "active_until": datum.active_until,
                "changed_by": vm.currentUser.userID
            };
            personData.updateNuclearInfoPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                        vm.nameDetailsValidate[indDetail] = datum.name;
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                        vm.nameDetails[indDetail] = datum.name;
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitPoleInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "people_institution_city_id": datum.people_institution_city_id,
                "pole": datum.institution_city_id
            };
            personData.updateInstitutionCityPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                        getAllPeopleWithRoles();
                        getAllPeopleNoRoles();
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitContactInfo = function (ind, indDetail, datum, validate) {
            // TODO: prepare for more than 1 personal phone or email??
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "personal_address_id": datum.personal_address_id,
                "personal_phone_id": datum.pers_phone[0].personal_phone_id,
                "personal_email_id": datum.pers_email[0].personal_email_id,
                "address": datum.address,
                "postal_code": datum.postal_code,
                "city": datum.city,
                "personal_phone": datum.pers_phone[0].personal_phone,
                "personal_email": datum.pers_email[0].personal_email
            };
            personData.updateContactInfoPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitIdentificationsInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentIDsValidate[indDetail],
                                  datum.identifications,
                                  'card_id', 'newIDs','updateIDs','deleteIDs');
            } else {
                data = processDataRows(vm.currentIDs[indDetail],
                                  datum.identifications,
                                  'card_id', 'newIDs','updateIDs','deleteIDs');
            }
            personData.updateIdentificationsPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitCarsInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentCarsValidate[indDetail],
                                  datum.cars,
                                  'id', 'newCars','updateCars','deleteCars');
            } else {
                data = processDataRows(vm.currentCars[indDetail],
                                  datum.cars,
                                  'id', 'newCars','updateCars','deleteCars');
            }
            personData.updateCarsPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitEmergencyContacts = function (ind, indDetail) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentEmergencyContacts[indDetail],
                                  vm.thisPerson[indDetail].emergency_contacts,
                                  'emergency_id', 'newContacts','updateContacts','deleteContacts');
            personData.updateEmergencyContactsPersonByID(vm.thisPerson[indDetail].id,data)
                .then( function () {
                    getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitInstitutionalContacts = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "phone_id": datum.work_phone[0].phone_id,
                "phone": datum.work_phone[0].phone,
                "extension": datum.work_phone[0].extension,
                "email_id": datum.work_email[0].email_id,
                "email": datum.work_email[0].email
            };
            personData.updateInstitutionalContactsPersonByID(datum.id,data)
                .then( function () {
                     if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitResearcherInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "pluriannual":datum.researcher_data[0].pluriannual,
                "integrated":datum.researcher_data[0].integrated,
                "nuclearCV":datum.researcher_data[0].nuclearCV,
                "researcher_id": datum.researcher_data[0].researcher_id,
                "association_key": datum.researcher_data[0].association_key,
                "researcherID": datum.researcher_data[0].researcherID,
                "scopusID": datum.researcher_data[0].scopusID,
                "ORCID": datum.researcher_data[0].ORCID,
            };
            personData.updateResearcherInfoPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAffiliationLab = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentAffiliationsLabValidate[indDetail],datum.lab_data,
                                  'people_lab_id', 'newAffiliationsLab','updateAffiliationsLab','deleteAffiliationsLab');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsLabValidate[indDetail], 'lab');
            } else {
                data = processDataRows(vm.currentAffiliationsLab[indDetail],datum.lab_data,
                                  'people_lab_id', 'newAffiliationsLab','updateAffiliationsLab','deleteAffiliationsLab');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsLab[indDetail], 'lab');
            }
            data['changed_by'] = vm.currentUser.userID;
            personData.updateAffiliationsLabPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                        getAllPeopleWithRoles();
                    }
                },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {
                    }
                );
            return false;
        };
        vm.submitCostCenters = function (ind, indDetail, datum) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentCostCenters[indDetail], datum.cost_centers,
                                  'people_cost_centers_id', 'newCostCenters','updateCostCenters','deleteCostCenters');
            personData.updateCostCentersPersonByID(datum.id,data)
                .then( function () {
                    getPersonData(datum.id, indDetail, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitTechnicianInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "id": datum.technician_data[0].id,
                "association_key": datum.technician_data[0].association_key,
                "researcherID": datum.technician_data[0].researcherID,
                "ORCID": datum.technician_data[0].ORCID
            };

            personData.updateTechnicianInfoPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAffiliationTechnician = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentAffiliationsTechValidate[indDetail],datum.technician_offices,
                                  'tech_id', 'newAffiliations','updateAffiliations','deleteAffiliations');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsTechValidate[indDetail], 'technician');
            } else {
                data = processDataRows(vm.currentAffiliationsTech[indDetail],datum.technician_offices,
                                  'tech_id', 'newAffiliations','updateAffiliations','deleteAffiliations');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsTech[indDetail], 'technician');
            }
            data['changed_by'] = vm.currentUser.userID;
            // finds earliest date in department and lab/techn/... affiliation

            personData.updateTechnicianAffiliationsPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                        getAllPeopleWithRoles();
                    }
                },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {
                    }
                );
            return false;
        };
        vm.submitScManInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "id": datum.science_manager_data[0].id,
                "association_key": datum.science_manager_data[0].association_key,
                "researcherID": datum.science_manager_data[0].researcherID,
                "ORCID": datum.science_manager_data[0].ORCID
            };

            personData.updateScienceManagerInfoPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAffiliationScMan = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentAffiliationsScManValidate[indDetail],datum.science_manager_offices,
                                  'sc_man_id', 'newAffiliations','updateAffiliations','deleteAffiliations');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsScManValidate[indDetail], 'scienceManager');
            } else {
                data = processDataRows(vm.currentAffiliationsScMan[indDetail],datum.science_manager_offices,
                                  'sc_man_id', 'newAffiliations','updateAffiliations','deleteAffiliations');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsScMan[indDetail], 'scienceManager');
            }
            data['changed_by'] = vm.currentUser.userID;
            personData.updateScienceManagerAffiliationsPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                        getAllPeopleWithRoles();
                    }
                },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {
                    }
                );
            return false;
        };
        vm.submitAdmInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "id": datum.administrative_data[0].id,
                "association_key": datum.administrative_data[0].association_key
            };

            personData.updateAdministrativeInfoPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAffiliationAdm = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentAffiliationsAdmValidate[indDetail],datum.administrative_offices,
                                  'adm_id', 'newAffiliations','updateAffiliations','deleteAffiliations');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsAdmValidate[indDetail], 'administrative');
            } else {
                data = processDataRows(vm.currentAffiliationsAdm[indDetail],datum.administrative_offices,
                                  'adm_id', 'newAffiliations','updateAffiliations','deleteAffiliations');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsAdm[indDetail], 'administrative');
            }
            data['changed_by'] = vm.currentUser.userID;
            personData.updateAdministrativeAffiliationsPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                        getAllPeopleWithRoles();
                    }
                },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {
                    }
                );
            return false;
        };
        vm.submitFinishedDegrees = function (ind, indDetail) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentFinishedDegrees[indDetail],vm.initialFinishedDegrees[indDetail],
                                  'degrees_people_id', 'newDegrees','updateDegrees','deleteDegrees');
            var dataSupervisors = {};
            var dataExtSupervisors = {};
            for (var indDeg in vm.currentFinishedDegrees[indDetail]) {
                var currDegID = vm.currentFinishedDegrees[indDetail][indDeg].degrees_people_id;
                for (var indInit in vm.initialFinishedDegrees[indDetail]) {
                    var initDegID = vm.initialFinishedDegrees[indDetail][indInit].degrees_people_id;
                    if (currDegID === initDegID
                            && (currDegID !== null && currDegID !== 'new')
                            && (initDegID !== null && initDegID !== 'new')) {
                        var dataSup = processDataRows(vm.currentFinishedDegrees[indDetail][indDeg].supervisors,vm.initialFinishedDegrees[indDetail][indInit].supervisors,
                                      'degrees_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        var dataExtSup = processDataRows(vm.currentFinishedDegrees[indDetail][indDeg].external_supervisors,vm.initialFinishedDegrees[indDetail][indInit].external_supervisors,
                                      'degrees_ext_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        var newDataSup = [];
                        var newDataExtSup = [];
                        for (var indSup in dataSup.newSupervisors) {
                            if (dataSup.newSupervisors[indSup].degrees_supervisors_id !== null) {
                                newDataSup.push(dataSup.newSupervisors[indSup]);
                            }
                        }
                        dataSup.newSupervisors = newDataSup;
                        for (var indSup in dataExtSup.newSupervisors) {
                            if (dataExtSup.newSupervisors[indSup].degrees_ext_supervisors_id !== null) {
                                newDataExtSup.push(dataExtSup.newSupervisors[indSup]);
                            }
                        }
                        dataExtSup.newSupervisors = newDataExtSup;
                        dataSupervisors[currDegID] = dataSup;
                        dataExtSupervisors[currDegID] = dataExtSup;
                    }
                }
            }
            data = {degree_data:  data,
                    degree_supervisors: dataSupervisors,
                    degree_ext_supervisors: dataExtSupervisors
            };
            personData.updateFinishedDegreesPersonByID(vm.thisPerson[indDetail].id,data)
                .then( function () {
                    getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitOngoingDegrees = function (ind, indDetail) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentOngoingDegrees[indDetail],vm.initialOngoingDegrees[indDetail],
                                  'degrees_people_id', 'newDegrees','updateDegrees','deleteDegrees');
            var dataSupervisors = {};
            var dataExtSupervisors = {};
            for (var indDeg in vm.currentOngoingDegrees[indDetail]) {
                var currDegID = vm.currentOngoingDegrees[indDetail][indDeg].degrees_people_id;
                for (var indInit in vm.initialOngoingDegrees[indDetail]) {
                    var initDegID = vm.initialOngoingDegrees[indDetail][indInit].degrees_people_id;
                    if (currDegID === initDegID
                            && (currDegID !== null && currDegID !== 'new')
                            && (initDegID !== null && initDegID !== 'new')) {
                        var dataSup = processDataRows(vm.currentOngoingDegrees[indDetail][indDeg].supervisors,
                                      vm.initialOngoingDegrees[indDetail][indInit].supervisors,
                                      'degrees_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        var dataExtSup = processDataRows(vm.currentOngoingDegrees[indDetail][indDeg].external_supervisors,
                                      vm.initialOngoingDegrees[indDetail][indInit].external_supervisors,
                                      'degrees_ext_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        var newDataSup = [];
                        var newDataExtSup = [];
                        for (var indSup in dataSup.newSupervisors) {
                            if (dataSup.newSupervisors[indSup].degrees_supervisors_id !== null) {
                                newDataSup.push(dataSup.newSupervisors[indSup]);
                            }
                        }
                        dataSup.newSupervisors = newDataSup;
                        for (var indSup in dataExtSup.newSupervisors) {
                            if (dataExtSup.newSupervisors[indSup].degrees_ext_supervisors_id !== null) {
                                newDataExtSup.push(dataExtSup.newSupervisors[indSup]);
                            }
                        }
                        dataExtSup.newSupervisors = newDataExtSup;
                        dataSupervisors[currDegID] = dataSup;
                        dataExtSupervisors[currDegID] = dataExtSup;
                    }
                }
            }
            data = {degree_data:  data,
                    degree_supervisors: dataSupervisors,
                    degree_ext_supervisors: dataExtSupervisors
            };
            personData.updateOngoingDegreesPersonByID(vm.thisPerson[indDetail].id,data)
                .then( function () {
                    getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitResponsibles = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentResponsiblesValidate[indDetail],
                                  datum.responsibles,
                                  'people_responsibles_id',
                                  'newResponsibles','updateResponsibles','deleteResponsibles');
            } else {
                data = processDataRows(vm.currentResponsibles[indDetail],
                                  datum.responsibles,
                                  'people_responsibles_id',
                                  'newResponsibles','updateResponsibles','deleteResponsibles');
            }
            personData.updateResponsiblesPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitJob = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentProfessionalSituationValidate[indDetail],datum.job_data,
                                  'job_id', 'newJobs','updateJobs','deleteJobs');
            } else {
                data = processDataRows(vm.currentProfessionalSituation[indDetail],datum.job_data,
                                  'job_id', 'newJobs','updateJobs','deleteJobs');
            }
            data['originalJobData'] = datum.job_data;
            personData.updateJobsPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                        getAllPeopleWithRoles();
                    }
                },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {
                    }
                );
            return false;
        };
        vm.submitDepartmentInfo = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data;
            if (validate === true) {
                data = processDataRows(vm.currentAffiliationsDepartmentValidate[indDetail],datum.department_data,
                                  'people_departments_id', 'newAffiliationsDep','updateAffiliationsDep','deleteAffiliationsDep');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsDepartmentValidate[indDetail], 'department');
            } else {
                data = processDataRows(vm.currentAffiliationsDepartment[indDetail],datum.department_data,
                                  'people_departments_id', 'newAffiliationsDep','updateAffiliationsDep','deleteAffiliationsDep');
                data['earliest_date'] = findEarliestDate(datum, vm.currentAffiliationsDepartment[indDetail], 'department');
            }
            data['changed_by'] = vm.currentUser.userID;
            personData.updateAffiliationsDepartmentPersonByID(datum.id,data)
                .then( function () {
                    if (validate === true) {
                        getPersonDataValidate(datum.id, indDetail, ind);
                    } else {
                        getPersonData(datum.id, indDetail, ind);
                    }
                },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {
                    }
                );
            return false;
        };
        vm.submitLeftInfo = function (ind, indDetail) {
            var result = window.confirm('Are you sure?\n\nThis will change end dates for ongoing affiliations.');
            if (result) {
                vm.updateStatus[ind] = "Updating...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;
                var data = {
                    active_until: vm.thisPerson[indDetail].active_until,
                    lab_data: vm.thisPerson[indDetail].lab_data,
                    technician_offices: vm.thisPerson[indDetail].technician_offices,
                    science_manager_offices: vm.thisPerson[indDetail].science_manager_offices,
                    administrative_offices: vm.thisPerson[indDetail].administrative_offices,
                    changed_by: vm.currentUser.userID
                };
                personData.updatePersonLeftByID(vm.thisPerson[indDetail].id,data)
                    .then( function () {
                        getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                    },
                        function () {
                            vm.updateStatus[ind] = "Error!";
                            vm.messageType[ind] = 'message-error';
                        },
                        function () {
                        }
                    );
            }
            return false;
        };
        vm.submitUserValidation  = function (ind, indDetail, datum, validate) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var unit = [];
            for (var el in vm.currentAffiliationsLabValidate[indDetail]) {
                if (vm.currentAffiliationsLabValidate[indDetail][el].unit_id !== undefined) {
                    if (unit.indexOf(vm.currentAffiliationsLabValidate[indDetail][el].unit_id) === -1) {
                        unit.push(vm.currentAffiliationsLabValidate[indDetail][el].unit_id);
                    }
                }
            }
            for (var el in vm.currentAffiliationsTechValidate[indDetail]) {
                if (vm.currentAffiliationsTechValidate[indDetail][el].tech_unit_id !== undefined) {
                    if (unit.indexOf(vm.currentAffiliationsTechValidate[indDetail][el].tech_unit_id) === -1) {
                        unit.push(vm.currentAffiliationsTechValidate[indDetail][el].tech_unit_id);
                    }
                }
            }
            for (var el in vm.currentAffiliationsScManValidate[indDetail]) {
                if (vm.currentAffiliationsScManValidate[indDetail][el].sc_man_unit_id !== undefined) {
                    if (unit.indexOf(vm.currentAffiliationsScManValidate[indDetail][el].sc_man_unit_id) === -1) {
                        unit.push(vm.currentAffiliationsScManValidate[indDetail][el].sc_man_unit_id);
                    }
                }
            }
            for (var el in vm.currentAffiliationsAdmValidate[indDetail]) {
                if (vm.currentAffiliationsAdmValidate[indDetail][el].adm_unit_id !== undefined) {
                    if (unit.indexOf(vm.currentAffiliationsAdmValidate[indDetail][el].adm_unit_id) === -1) {
                        unit.push(vm.currentAffiliationsAdmValidate[indDetail][el].adm_unit_id);
                    }
                }
            }
            var data = {
                "name": datum.name,
                "person_id": datum.id,
                "user_id": datum.user_id,
                "colloquial_name": datum.colloquial_name,
                "birth_date": datum.birth_date,
                "gender": datum.gender,
                "active_from": datum.active_from,
                "active_until": datum.active_until,
                "city_id": datum.institution_city_id,
                "changed_by": vm.currentUser.userID,
                "personal_email": datum.pers_email[0].personal_email,
                "unit": unit,
                "datum": datum
            };
            managerData.validatePerson(datum.id, data)
                .then( function () {
                    vm.watchImageValidate[indDetail]();
                    initializeDetails();
                    getAllPeopleWithRoles();
                    getAllPeopleNoRoles();
                    getAllPeopleToValidate();
                    vm.updateStatus[ind] = "Updated!";
                    vm.messageType[ind] = 'message-success';
                    vm.hideMessage[ind] = false;
                    $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                },
                function (error) {
                    vm.updateStatus[ind] = "Error! Contact admin." + error.data.status;
                    vm.messageType[ind] = 'message-error';
                    vm.hideMessage[ind] = false;
                    $timeout(function () {
                        vm.hideMessage[ind] = true;
                        vm.watchImageValidate[indDetail]();
                        initializeDetails();
                        getAllPeopleWithRoles();
                        getAllPeopleNoRoles();
                        getAllPeopleToValidate();
                    }, 10000);
                },
                function () {}
                );
            return false;
        };
        vm.submitAuthorNames = function (ind, indDetail) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                addAuthorNames: vm.newAuthorNames[indDetail],
                delAuthorNames: vm.delAuthorNames[indDetail]
            };
            publications.updateAuthorNamesPerson(vm.thisPerson[indDetail].id,data)
                .then( function () {
                    //getPersonData(vm.currentUser.personID, ind);
                    getPersonData(vm.thisPerson[indDetail].id, indDetail, ind);
                    initializeVariables(ind,indDetail);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };

        vm.nothingToShow = function (arrObj, key) {
            if (arrObj !== null && arrObj !== undefined) {
                if (arrObj.length === 0) return true;
                if (arrObj.length === 1 && arrObj[0][key] === null) return true;
                return false;
            }
            return true;
        };
        vm.isEmpty = function (arr) {
            if (arr !== undefined) {
                if (arr.length === 0) return true;
                return false;
            }
            return true;
        };
        vm.removePerson = function (personID) {
            var result = window.confirm('Are you sure this person was never a member of the organization?' +
                '\n\nThis will come into force only if, afterwards, you press the "Update" button.');
            if (result) {
                vm.currPeople = [];
                personData.thisPersonData(personID)
                    .then(function (response) {
                        vm.deleteNeverMember.push(response.data.result);
                        vm.newPersonList = [];
                        for (var el in vm.allPeople) {
                            if (vm.allPeople[el]['person_id'] !== personID) {
                                vm.newPersonList.push(vm.allPeople[el]);
                            }
                        }
                        vm.allPeople = vm.newPersonList;
                        vm.renderPeople();
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            }
        };
        vm.removeRows2 = function (current, ind) {
            current.splice(ind,1);
        };
        vm.addRows2 = function (current,type) {
            var obj = {};
            if (type === 'identifications') {
                if (current.length == 1 && current[0]['card_id'] === null) {
                    current[0]['card_id'] = 'new';
                } else {
                    obj = {card_id: 'new', card_type: null, card_type_id: null, card_number: null, card_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'emergencyContacts') {
                if (current.length == 1 && current[0]['emergency_id'] === null) {
                    current[0]['emergency_id'] = 'new';
                } else {
                    obj = {emergency_id: 'new', emergency_name: null, emergency_phone: null};
                    current.push(obj);
                }
            } if (type === 'fct-status') {
                obj = {
                        status_fct_id: 'new', unit_id: null, locked: null,
                        must_be_added: null, addition_requested: null,
                        must_be_removed: null, removal_requested: null,
                        valid_from: null, valid_until: null
                    };
                current.push(obj);
            } else if (type === 'costCenters') {
                if (current.length == 1 && current[0]['people_cost_centers_id'] === null) {
                    current[0]['people_cost_centers_id'] = 'new';
                } else {
                    obj = {people_cost_centers_id: 'new', cost_center_id: null,
                           short_name: null, name: null, valid_from: null, valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'affiliationsLab') {
                if (current.length == 1 && current[0]['people_lab_id'] === null) {
                    current[0]['people_lab_id'] = 'new';
                } else {
                    obj = {people_lab_id: 'new', lab_row: null, lab_id: null, lab: null, dedication: null, lab_position: null,
                           lab_position_id: null, group_id: null, group_name: null, lab_start: null, lab_end: null,
                           unit_id: null, unit: null};
                    current.push(obj);
                }
            } else if (type === 'affiliationsTech') {
                if (current.length == 1 && current[0]['tech_id'] === null) {
                    current[0]['tech_id'] = 'new';
                } else {
                    obj = {tech_id: 'new', tech_office_id: null, tech_office_name_en: null, tech_dedication: null,
                           tech_position_id: null, tech_position_name_en: null,
                            tech_valid_from: null, tech_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'affiliationsScMan') {
                if (current.length == 1 && current[0]['sc_man_id'] === null) {
                    current[0]['sc_man_id'] = 'new';
                } else {
                    obj = {sc_man_id: 'new', sc_man_office_id: null, sc_man_office_name_en: null, sc_man_dedication: null,
                           sc_man_position_id: null, sc_man_position_name_en: null,
                            sc_man_valid_from: null, sc_man_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'affiliationsAdm') {
                if (current.length == 1 && current[0]['adm_id'] === null) {
                    current[0]['adm_id'] = 'new';
                } else {
                    obj = {adm_id: 'new', adm_office_id: null, adm_office_name_en: null, adm_dedication: null,
                           adm_position_id: null, adm_position_name_en: null,
                            adm_valid_from: null, adm_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'affiliationsDepartment') {
                if (current.length == 1 && current[0]['people_departments_id'] === null) {
                    current[0]['people_departments_id'] = 'new';
                } else {
                    obj = {people_departments_id: 'new', department_id: null, department: null,
                            department_start: null, department_end: null};
                    current.push(obj);
                }
            } else if (type === 'jobs') {
                if (current.length == 1 && current[0]['job_id'] === null) {
                    current[0]['job_id'] = 'new';
                } else {
                    obj = {job_id: 'new', job_situation_id: null, job_situation_name_en: null,
                           job_situation_requires_unit_contract: null,
                           job_situation_requires_fellowship: null,
                           job_category_id: null, job_category_name_en: null,
                           job_organization: null, job_dedication: null,
                           job_valid_from: null, job_valid_until: null,
                           contract_id: null, contract_reference: null,
                           contract_start: null, contract_end: null, contract_maximum_extension: null,
                           fellowship_id: null, fellowship_type_id: null, fellowship_type_name: null, fellowship_type_acronym: null,
                           funding_agency_id: null, funding_agency_official_name: null, funding_agency_short_name: null,
                           management_entity_id: null, management_entity_official_name: null, management_entity_short_name: null,
                           fellowship_reference: null,
                           fellowship_start: null, fellowship_end: null, fellowship_maximum_extension: null
                    };
                    current.push(obj);
                }
            } else if (type === 'finishedDegrees') {
                if (current.length == 1 && current[0]['degrees_people_id'] === null) {
                    current[0]['degrees_people_id'] = 'new';
                } else {
                    obj = {degrees_people_id: 'new', degree_type_id: null, degree_name:null,
                           degree_area: null, degree_institution:null,
                           degree_title: null, degree_program: null,
                           degree_start: null,degree_end: null,
                           supervisors: [], external_supervisors: []
                    };
                    current.push(obj);
                }
            } else if (type === 'ongoingDegrees') {
                if (current.length == 1 && current[0]['degrees_people_id'] === null) {
                    current[0]['degrees_people_id'] = 'new';
                } else {
                    obj = {degrees_people_id: 'new', degree_type_id: null, degree_name:null,
                           degree_area: null, degree_institution:null,
                           degree_title: null, degree_program: null,
                           degree_start: null, degree_estimate_end: null, degree_end: null,
                           supervisors: [], external_supervisors: []
                    };
                    current.push(obj);
                }
            } else if (type === 'degreeSupervisors') {
                if (current.length == 1 && current[0]['degrees_supervisors_id'] === null) {
                    current[0]['degrees_supervisors_id'] = 'new';
                } else {
                    obj = {degrees_supervisors_id:'new',
                        supervisor_type_id:null,supervisor_type_name_en:null,supervisor_id:null, supervisor_name:null,
                        valid_from:null,valid_until:null};
                    current.push(obj);
                }
            } else if (type === 'degreeExtSupervisors') {
                if (current.length == 1 && current[0]['degrees_ext_supervisors_id'] === null) {
                    current[0]['degrees_ext_supervisors_id'] = 'new';
                } else {
                    obj = {degrees_ext_supervisors_id:'new',
                        supervisor_type_id:null,supervisor_type_name_en:null,
                        supervisor_name:null,supervisor_organization:null,
                        valid_from:null,valid_until:null};
                    current.push(obj);
                }
            } else if (type === 'responsibles') {
                if (current.length == 1 && current[0]['people_responsibles_id'] === null) {
                    current[0]['people_responsibles_id'] = 'new';
                } else {
                    obj = {
                        people_responsibles_id: 'new',
                        responsible_id: null,
                        responsible_type_id: null,
                        type_name_en:null,
                        valid_from: null,
                        valid_until: null
                    };
                    current.push(obj);
                }
            } else if (type === 'cars') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: null,
                        license: null,
                        brand: null,
                        model: null,
                        color: null,
                        plate: null
                    };
                    current.push(obj);
                }
            }

        };
        vm.isPorto = function(indDetail) {
            if (vm.thisPerson[indDetail].institution_city_name === 'Porto') {
                return true;
            }
            return false;
        };

        vm.switchValue = function (val) {
            if (val === 1 || val === true || val === 'Yes') return 'Yes';
            return 'No';
        };
        vm.updateOnSelect = function (arrObj, source, num, keyID, keyUpd){
            for (var el in source) {
                if(source[el][keyID] === arrObj[num][keyID]) {
                    for (var indKey in keyUpd) {
                        arrObj[num][keyUpd[indKey]] = source[el][keyUpd[indKey]];
                    }
                }
            }
        };
        vm.closeTabs = function() {
            for (var el in vm.nameDetails) {
                vm.watchImage[el]();
            }
            for (var el in vm.nameDetailsValidate) {
                vm.watchImageValidate[el]();
            }
            initializeDetails();
        };

        function findEarliestDate(thisPerson, data, type){
            var dates = [];
            var minDate;
            var datesLab = [];
            var datesTech = [];
            var datesScMan = [];
            var datesAdm = [];
            var datesDep = [];
            for (var ind in thisPerson.lab_data) {
                if (thisPerson.lab_data[ind].people_lab_id !== null) {
                    if (thisPerson.lab_data[ind].lab_start !== null) {
                        datesLab.push(moment(thisPerson.lab_data[ind].lab_start))
                    }
                }
            }
            for (var ind in thisPerson.technician_offices) {
                if (thisPerson.technician_offices[ind].tech_id !== null) {
                    if (thisPerson.technician_offices[ind].tech_valid_from !== null) {
                        datesTech.push(moment(thisPerson.technician_offices[ind].tech_valid_from))
                    }
                }
            }
            for (var ind in thisPerson.science_manager_offices) {
                if (thisPerson.science_manager_offices[ind].sc_man_id !== null) {
                    if (thisPerson.science_manager_offices[ind].sc_man_valid_from !== null) {
                        datesScMan.push(moment(thisPerson.science_manager_offices[ind].sc_man_valid_from))
                    }
                }
            }
            for (var ind in thisPerson.administrative_offices) {
                if (thisPerson.administrative_offices[ind].adm_id !== null) {
                    if (thisPerson.administrative_offices[ind].adm_valid_from !== null) {
                        datesAdm.push(moment(thisPerson.administrative_offices[ind].adm_valid_from))
                    }
                }
            }
            for (var ind in thisPerson.department_data) {
                if (thisPerson.department_data[ind].people_departments_id !== null) {
                    if (thisPerson.department_data[ind].department_start !== null) {
                        datesDep.push(moment(thisPerson.department_data[ind].department_start))
                    }
                }
            }
            if (type === 'lab') {
                for (var ind in data) {
                    if (data[ind].people_lab_id !== null) {
                        if (data[ind].lab_start !== null) {
                            dates.push(moment(data[ind].lab_start))
                        }
                    }
                }
                dates = dates.concat(datesTech,datesScMan,datesAdm,datesDep);
            } else if (type === 'technician') {
                for (var ind in data) {
                    if (data[ind].tech_id !== null) {
                        if (data[ind].tech_valid_from !== null) {
                            dates.push(moment(data[ind].tech_valid_from))
                        }
                    }
                }
                dates = dates.concat(datesLab,datesScMan,datesAdm,datesDep);
            } else if (type === 'scienceManager') {
                for (var ind in data) {
                    if (data[ind].sc_man_id !== null) {
                        if (data[ind].sc_man_valid_from !== null) {
                            dates.push(moment(data[ind].sc_man_valid_from))
                        }
                    }
                }
                dates = dates.concat(datesLab,datesTech,datesAdm,datesDep);
            } else if (type === 'administrative') {
                for (var ind in data) {
                    if (data[ind].adm_id !== null) {
                        if (data[ind].adm_valid_from !== null) {
                            dates.push(moment(data[ind].adm_valid_from))
                        }
                    }
                }
                dates = dates.concat(datesLab,datesTech,datesScMan,datesDep);
            } else if (type === 'department') {
                for (var ind in data) {
                    if (data[ind].people_departments_id !== null) {
                        if (data[ind].department_start !== null) {
                            dates.push(moment(data[ind].department_start))
                        }
                    }
                }
                dates = dates.concat(datesLab,datesTech,datesScMan,datesAdm);
            }
            if (dates.length === 0) {
                return null;
            } else {
                minDate = dates[0];
                for (var ind in dates) {
                    if (dates[ind].isBefore(minDate)) {
                        minDate = dates[ind];
                    }
                }
                return minDate;
            }
        }
        function processDate (date) {
            if (date !== null) {
                date = new Date(date);
            }
            return date;
        }
        function processDataRows(current, original, keyComparison, newName, updateName, deleteName) {
            var add = [];
            var del = [];
            var upd = [];
            var exist = 0;
            for (var curr in current) {
                exist = 0;
                for (var ori in original) {
                    if (current[curr][keyComparison] === original[ori][keyComparison]
                        &&
                       (current[curr][keyComparison] !== null && current[curr][keyComparison] !== 'new')) {
                        exist = 1;
                        if (!angular.equals(current[curr],original[ori])) {
                            upd.push(current[curr]);
                            break;
                        }
                    }
                }
                if (exist === 0) {
                    add.push(current[curr]);
                }
            }
            for (var ori in original) {
                exist = 0;
                for (var curr in current) {
                    if (current[curr][keyComparison] === original[ori][keyComparison]
                        && original[ori][keyComparison] !== null) {
                        exist = 1;
                        break;
                    }
                }
                if (exist === 0 && original[ori][keyComparison] !== null) {
                    del.push(original[ori]);
                }
            }
            var objReturn = {};
            objReturn[newName] = add;
            objReturn[updateName] = upd;
            objReturn[deleteName] = del;
            return objReturn;
        }
        function processNationalities (ind, datum, validate) {
            var selectNat;
            if (validate === true) {
                selectNat = vm.selectedNationalitiesValidate[ind];
            } else {
                selectNat = vm.selectedNationalities[ind];
            }
            var newNationalities = [];
            var deleteNationalities = [];
            var existNat = 0;
            for (var selNat in selectNat) {
                existNat = 0;
                for (var oriNat in datum.nationalities) {
                    if (selectNat[selNat].country_id === datum.nationalities[oriNat].country_id) {
                        existNat = 1;
                        break;
                    }
                }
                if (existNat === 0) {
                    newNationalities.push(selectNat[selNat]);
                }
            }
            for (var oriNat in datum.nationalities) {
                for (var selNat in selectNat) {
                    existNat = 0;
                    if (selectNat[selNat].country_id === datum.nationalities[oriNat].country_id) {
                        existNat = 1;
                        break;
                    }
                }
                if (existNat === 0) {
                    deleteNationalities.push(datum.nationalities[oriNat]);
                }
            }
            return {
                newNationalities: newNationalities,
                deleteNationalities: deleteNationalities
            };
        }
        function initializeRoles(el) {
            var roles =[];
            for (var ind in vm.thisPerson[el].roles_data) {
                if (vm.thisPerson[el].roles_data[ind].people_roles_id !== null) {
                    roles.push(Object.assign({},
                        {
                            people_roles_id: vm.thisPerson[el].roles_data[ind].people_roles_id,
                            role_id: vm.thisPerson[el].roles_data[ind].role_id,
                            name_en: vm.thisPerson[el].roles_data[ind].role_name
                        }
                    ));
                }
            }
            return roles;
        }
        function initializeRolesValidate(el) {
            var roles =[];
            for (var ind in vm.thisPersonValidate[el].roles_data) {
                if (vm.thisPersonValidate[el].roles_data[ind].people_roles_id !== null) {
                    roles.push(Object.assign({},
                        {
                            people_roles_id: vm.thisPersonValidate[el].roles_data[ind].people_roles_id,
                            role_id: vm.thisPersonValidate[el].roles_data[ind].role_id,
                            name_en: vm.thisPersonValidate[el].roles_data[ind].role_name
                        }
                    ));
                }
            }
            return roles;
        }
        function initializeDetails() {
            vm.nameDetails = [];
            vm.thisPerson = [];
            vm.hasPersonalEmail = [];
            vm.hasPersonalEmailValidate = [];
            vm.selectedNationalities = [];
            vm.currentIDs = [];
            vm.currentCars = [];

            vm.newAuthorNames = [];
            vm.delAuthorNames = [];

            vm.hasPhoto = [];
            vm.changePhoto = [];
            vm.imagePersonPre = [];
            vm.imagePerson = [];
            vm.imagePersonCropped = [];
            vm.imageTemp = [];
            vm.personImageType = [];
            vm.watchImage = [];

            vm.hasPhotoValidate = [];
            vm.changePhotoValidate = [];
            vm.imagePersonPreValidate = [];
            vm.imagePersonValidate = [];
            vm.imagePersonCroppedValidate = [];
            vm.imageTempValidate = [];
            vm.personImageTypeValidate = [];
            vm.watchImageValidate = [];

            vm.currentFinishedDegrees = [];
            vm.initialFinishedDegrees = [];
            vm.currentOngoingDegrees = [];
            vm.initialOngoingDegrees = [];

            vm.currentEmergencyContacts = [];
            vm.currentFCTStatus = [];
            vm.currentAffiliationsLab = [];
            vm.currentCostCenters = [];
            vm.currentAffiliationsTech = [];
            vm.currentAffiliationsScMan = [];
            vm.currentAffiliationsAdm = [];
            vm.currentAffiliationsDepartment = [];
            vm.currentRoles = [];
            vm.currentProfessionalSituation = [];
            vm.currentResponsibles = [];

            vm.nameDetailsValidate = [];
            vm.thisPersonValidate = [];
            vm.currentFCTStatusValidate = [];
            vm.selectedNationalitiesValidate = [];
            vm.currentIDsValidate = [];
            vm.currentCarsValidate = [];

            vm.currentFinishedDegreesValidate = [];
            vm.initialFinishedDegreesValidate = [];
            vm.currentOngoingDegreesValidate = [];
            vm.initialOngoingDegreesValidate = [];

            vm.currentEmergencyContactsValidate = [];
            vm.currentAffiliationsLabValidate = [];
            vm.currentAffiliationsTechValidate = [];
            vm.currentAffiliationsScManValidate = [];
            vm.currentAffiliationsAdmValidate = [];
            vm.currentAffiliationsDepartmentValidate = [];
            vm.currentRolesValidate = [];
            vm.currentProfessionalSituationValidate = [];
            vm.currentResponsiblesValidate = [];
        }
        function initializeVariables(ind,indDetail) {
            if (indDetail !== undefined) {
                vm.delAuthorNames[indDetail] = [];
                vm.newAuthorNames[indDetail] = [];
            }

            vm.allPeople = [];
            vm.allPeopleNoRoles = [];
            vm.allPeopleValidate = [];

            vm.updateLabPerson = [];
            vm.updateTechPerson = [];
            vm.updateManagePerson = [];
            vm.updateAdmPerson = [];

            vm.deleteNeverMember = [];

            vm.infoFormCompletion = 0;
            vm.sortType = 'person_name';
            vm.sortReverse = false;
            vm.searchName = '';
            vm.searchUnit = '';
            vm.searchGroup = '';
            vm.searchLab = '';
            vm.searchRole = '';
            vm.searchActiveDate = null;
            vm.totalPeople = vm.allPeople.length;
            vm.pageSize = 10;
            vm.totalFromSearch = 10;
            vm.currentPage = 1;
            vm.totalPages = Math.ceil(vm.totalPeople / vm.pageSize);
            // computes the number of pages
            vm.pages = [];
            for (var num=0; num<vm.totalPages; num++) {
                vm.pages.push(num);
            }
            vm.totalPeopleNoRoles = vm.allPeopleNoRoles.length;
            vm.pageSizeNoRoles = 10;
            vm.totalFromSearchNoRoles = 10;
            vm.currentPageNoRoles = 1;
            vm.totalPagesNoRoles = Math.ceil(vm.totalPeopleNoRoles / vm.pageSizeNoRoles);
            // computes the number of pages
            vm.pagesNoRoles = [];
            for (var num=0; num<vm.totalPagesNoRoles; num++) {
                vm.pagesNoRoles.push(num);
            }

            vm.searchNameValidate = '';
            vm.totalPeopleValidate = vm.allPeopleValidate.length;
            vm.pageSizeValidate = 10;
            vm.totalFromSearchValidate = 10;
            vm.currentPageValidate = 1;
            vm.totalPagesValidate = Math.ceil(vm.totalPeopleValidate / vm.pageSizeValidate);
            // computes the number of pages
            vm.pagesValidate = [];
            for (var num=0; num<vm.totalPagesValidate; num++) {
                vm.pagesValidate.push(num);
            }

            var formsArray = ['allPeople','personNuclear','personContact','personIdentifications',
                'personEmergency','personInstitutional','personDepartment','personResInfo',
                'personLabAffiliation','personRmResearcherRole','personProfessional','personTechInfo',
                'personTechLab','personManagerInfo','personManagerOffice','personAdministrativeInfo',
                'personAdministrativeOffice','personAffiliationTech','personAffiliationScMan',
                'personAffiliationAdm','personRmTechnicianRole','personRmScManRole',
                'personRmAdmRole','personFinishedDegrees','personOngoingDegrees',
                'personResponsibles','personPole','personLeft','validateNuclear',
                'validateContact','validateIdentifications','validateEmergency',
                'validateInstitutional','validateDepartment','validateResInfo',
                'validateLabAffiliation','validateRmResearcherRole','validateProfessional',
                'validateTechInfo','validateTechLab','validateManagerInfo','validateManagerOffice',
                'validateAdministrativeInfo','validateAdministrativeOffice','validateAffiliationTech',
                'validateAffiliationScMan','validateAffiliationAdm','validateRmTechnicianRole',
                'validateRmScManRole','validateRmAdmRole','validateFinishedDegrees',
                'validateOngoingDegrees','validateResponsibles','validatePole','validateUser',
                'personPasswordReset','personPhoto','personAuthorNames','validatePhoto',
                'personUserPermissions','validateUserPermissions','personCostCenter',
                'personCars','validateCars','personFCTStatus','validateFCTStatus',
                'personSelectedPub','personPubRemove'];
            /*vm.forms = {
                'allPeople': 0,
                'personNuclear': 1,
                'personContact': 2,
                'personIdentifications': 3,
                'personEmergency': 4,
                'personInstitutional': 5,
                'personDepartment': 6,
                'personResInfo': 7,
                'personLabAffiliation': 8,
                'personRmResearcherRole': 9,
                'personProfessional': 10,
                'personTechInfo': 11,
                'personTechLab': 12,
                'personManagerInfo': 13,
                'personManagerOffice': 14,
                'personAdministrativeInfo': 15,
                'personAdministrativeOffice': 16,
                'personAffiliationTech': 17,
                'personAffiliationScMan': 18,
                'personAffiliationAdm': 19,
                'personRmTechnicianRole': 20,
                'personRmScManRole': 21,
                'personRmAdmRole': 22,
                'personFinishedDegrees': 23,
                'personOngoingDegrees': 24,
                'personResponsibles': 25,
                'personPole': 26,
                'personLeft': 27,
                'validateNuclear': 28,
                'validateContact': 29,
                'validateIdentifications': 30,
                'validateEmergency': 31,
                'validateInstitutional': 32,
                'validateDepartment': 33,
                'validateResInfo': 34,
                'validateLabAffiliation': 35,
                'validateRmResearcherRole': 36,
                'validateProfessional': 37,
                'validateTechInfo': 38,
                'validateTechLab': 39,
                'validateManagerInfo': 40,
                'validateManagerOffice': 41,
                'validateAdministrativeInfo': 42,
                'validateAdministrativeOffice': 43,
                'validateAffiliationTech': 44,
                'validateAffiliationScMan': 45,
                'validateAffiliationAdm': 46,
                'validateRmTechnicianRole': 47,
                'validateRmScManRole': 48,
                'validateRmAdmRole': 49,
                'validateFinishedDegrees': 50,
                'validateOngoingDegrees': 51,
                'validateResponsibles': 52,
                'validatePole': 53,
                'validateUser':54,
                'personPasswordReset': 55,
                'personPhoto':56,
                'personAuthorNames': 57,
                'validatePhoto': 58,
                'personUserPermissions': 59,
                'validateUserPermissions': 60,
                'personCostCenter': 61,
                'personCars': 62,
                'validateCars': 63,
                'personFCTStatus': 64,
                'validateFCTStatus': 65
            };*/

            if (ind === undefined) {
                //var numberCards = Object.keys(vm.forms).length; // the number of cards with "Update" in each tab
                //var numberCards = formsArray.length;
                vm.updateStatus = [];
                vm.messageType = [];
                vm.hideMessage = [];
                vm.forms = {};
                for (var el in formsArray) {
                    vm.forms[formsArray[el]] = el;
                    vm.updateStatus.push('');
                    vm.messageType.push('message-updating');
                    vm.hideMessage.push(true);
                }
            }
            vm.accessPermission = authentication.access('manager');
            vm.currentUser = authentication.currentUser();
        }
        function getPersonData(personID, el, ind) {
            if (el === -1) {
                el = vm.nameDetails.length - 1;
            }
            personData.thisPersonData(personID)
                .then(function (response) {
                    var date;
                    vm.thisPerson[el] = response.data.result;
                    vm.thisPerson[el].originalUsername = vm.thisPerson[el].username;
                    if (vm.thisPerson[el]['birth_date'] !== null) {
                        date = new Date(vm.thisPerson[el]['birth_date']);
                        vm.thisPerson[el]['birth_date'] = date;
                    }
                    if (vm.thisPerson[el].pers_photo[0].personal_photo_id !== null) {
                        vm.hasPhoto[el] = true;
                    }

                    if (vm.thisPerson[el].pers_email[0].personal_email === null
                        || vm.thisPerson[el].pers_email[0].personal_email === "") {
                        vm.hasPersonalEmail[el] = false;
                    } else {
                        vm.hasPersonalEmail[el] = true;
                    }

                    vm.thisPerson[el]['active_until'] = processDate(vm.thisPerson[el]['active_until']);
                    vm.thisPerson[el]['active_from'] = processDate(vm.thisPerson[el]['active_from']);

                    for (var nat in vm.thisPerson[el].nationalities) {
                        vm.selectedNationalities[el].push(Object.assign({}, vm.thisPerson[el].nationalities[nat]));
                    }
                    vm.currentIDs[el] = [];
                    for (var id in vm.thisPerson[el].identifications) {
                        vm.thisPerson[el].identifications[id]['card_valid_until'] = processDate(vm.thisPerson[el].identifications[id]['card_valid_until']);
                        vm.currentIDs[el].push(Object.assign({}, vm.thisPerson[el].identifications[id]));
                    }
                    vm.currentCars[el] = [];
                    for (var id in vm.thisPerson[el].cars) {
                        vm.currentCars[el].push(Object.assign({}, vm.thisPerson[el].cars[id]));
                    }
                    var authors = [];
                    for (var id in vm.thisPerson[el].author_data) {
                        if (vm.thisPerson[el].author_data[id].author_name_id !== null) {
                            authors.push(vm.thisPerson[el].author_data[id]);
                        }
                    }
                    vm.thisPerson[el].author_data = authors;

                    vm.currentEmergencyContacts[el] = [];
                    for (var id in vm.thisPerson[el].emergency_contacts) {
                        vm.currentEmergencyContacts[el].push(Object.assign({}, vm.thisPerson[el].emergency_contacts[id]));
                    }

                    vm.currentFCTStatus[el] = [];
                    for (var id in vm.thisPerson[el].status_fct) {
                        vm.thisPerson[el].status_fct[id]['valid_from'] = processDate(vm.thisPerson[el].status_fct[id]['valid_from']);
                        vm.thisPerson[el].status_fct[id]['valid_until'] = processDate(vm.thisPerson[el].status_fct[id]['valid_until']);
                        vm.thisPerson[el].status_fct[id].locked = vm.thisPerson[el].status_fct[id].locked === null ? 0 : vm.thisPerson[el].status_fct[id].locked;
                        vm.thisPerson[el].status_fct[id].must_be_added = vm.thisPerson[el].status_fct[id].must_be_added === null ? 0 : vm.thisPerson[el].status_fct[id].must_be_added;
                        vm.thisPerson[el].status_fct[id].must_be_removed = vm.thisPerson[el].status_fct[id].must_be_removed === null ? 0 : vm.thisPerson[el].status_fct[id].must_be_removed;
                        vm.thisPerson[el].status_fct[id].addition_requested = vm.thisPerson[el].status_fct[id].addition_requested === null ? 0 : vm.thisPerson[el].status_fct[id].addition_requested;
                        vm.thisPerson[el].status_fct[id].removal_requested = vm.thisPerson[el].status_fct[id].removal_requested === null ? 0 : vm.thisPerson[el].status_fct[id].removal_requested;
                        vm.currentFCTStatus[el].push(Object.assign({}, vm.thisPerson[el].status_fct[id]));
                    }

                    vm.currentFinishedDegrees[el] = [];
                    vm.currentOngoingDegrees[el] = [];
                    for (var id in vm.thisPerson[el].degrees) {
                        vm.thisPerson[el].degrees[id]['degree_start'] = processDate(vm.thisPerson[el].degrees[id]['degree_start']);
                        vm.thisPerson[el].degrees[id]['degree_estimate_end'] = processDate(vm.thisPerson[el].degrees[id]['degree_estimate_end']);
                        vm.thisPerson[el].degrees[id]['degree_end'] = processDate(vm.thisPerson[el].degrees[id]['degree_end']);
                        for (var id2 in vm.thisPerson[el].degrees[id].supervisors) {
                            vm.thisPerson[el].degrees[id].supervisors[id2]['valid_from'] =
                                processDate(vm.thisPerson[el].degrees[id].supervisors[id2]['valid_from']);
                            vm.thisPerson[el].degrees[id].supervisors[id2]['valid_until'] =
                                processDate(vm.thisPerson[el].degrees[id].supervisors[id2]['valid_until']);
                        }
                        for (var id2 in vm.thisPerson[el].degrees[id].external_supervisors) {
                            vm.thisPerson[el].degrees[id].external_supervisors[id2]['valid_from'] =
                                processDate(vm.thisPerson[el].degrees[id].external_supervisors[id2]['valid_from']);
                            vm.thisPerson[el].degrees[id].external_supervisors[id2]['valid_until'] =
                                processDate(vm.thisPerson[el].degrees[id].external_supervisors[id2]['valid_until']);
                        }
                        if (vm.thisPerson[el].degrees[id]['degree_end'] !== null) {
                            if (moment(vm.thisPerson[el].degrees[id]['degree_end'])
                                    .isAfter(moment())) {
                                vm.currentOngoingDegrees[el].push(Object.assign({}, vm.thisPerson[el].degrees[id]));
                            } else {
                                vm.currentFinishedDegrees[el].push(Object.assign({}, vm.thisPerson[el].degrees[id]));
                            }
                        } else {
                            vm.currentOngoingDegrees[el].push(Object.assign({}, vm.thisPerson[el].degrees[id]));
                        }
                    }

                    vm.initialFinishedDegrees[el] = JSON.parse(JSON.stringify(vm.currentFinishedDegrees[el]));
                    vm.initialOngoingDegrees[el] = JSON.parse(JSON.stringify(vm.currentOngoingDegrees[el]));

                    vm.currentRoles[el] = initializeRoles(el);

                    vm.currentAffiliationsLab[el] = [];
                    for (var id in vm.thisPerson[el].lab_data) {
                        vm.thisPerson[el].lab_data[id]['lab_start'] = processDate(vm.thisPerson[el].lab_data[id]['lab_start']);
                        vm.thisPerson[el].lab_data[id]['lab_end'] = processDate(vm.thisPerson[el].lab_data[id]['lab_end']);
                        vm.thisPerson[el].lab_data[id]['labs_groups_valid_from'] = processDate(vm.thisPerson[el].lab_data[id]['labs_groups_valid_from']);
                        vm.thisPerson[el].lab_data[id]['labs_groups_valid_until'] = processDate(vm.thisPerson[el].lab_data[id]['labs_groups_valid_until']);
                        vm.thisPerson[el].lab_data[id]['lab_opened'] = processDate(vm.thisPerson[el].lab_data[id]['lab_opened']);
                        vm.thisPerson[el].lab_data[id]['lab_closed'] = processDate(vm.thisPerson[el].lab_data[id]['lab_closed']);
                        for (var id_lab in vm.labs) {
                            if (vm.labs[id_lab].lab_id === vm.thisPerson[el].lab_data[id].lab_id
                                && vm.labs[id_lab].group_id === vm.thisPerson[el].lab_data[id].group_id) {
                                vm.thisPerson[el].lab_data[id]['lab_row'] = vm.labs[id_lab].lab_row;
                                break;
                            }
                        }
                        vm.currentAffiliationsLab[el].push(Object.assign({}, vm.thisPerson[el].lab_data[id]));
                    }

                    vm.currentCostCenters[el] = [];
                    for (var id in vm.thisPerson[el].cost_centers) {
                        vm.thisPerson[el].cost_centers[id]['valid_from'] = processDate(vm.thisPerson[el].cost_centers[id]['valid_from']);
                        vm.thisPerson[el].cost_centers[id]['valid_until'] = processDate(vm.thisPerson[el].cost_centers[id]['valid_until']);
                        vm.currentCostCenters[el].push(Object.assign({}, vm.thisPerson[el].cost_centers[id]));
                    }

                    vm.currentAffiliationsTech[el] = [];
                    for (var id in vm.thisPerson[el].technician_offices) {
                        vm.thisPerson[el].technician_offices[id]['tech_valid_from'] = processDate(vm.thisPerson[el].technician_offices[id]['tech_valid_from']);
                        vm.thisPerson[el].technician_offices[id]['tech_valid_until'] = processDate(vm.thisPerson[el].technician_offices[id]['tech_valid_until']);
                        vm.currentAffiliationsTech[el].push(Object.assign({}, vm.thisPerson[el].technician_offices[id]));
                    }
                    vm.currentAffiliationsScMan[el] = [];
                    for (var id in vm.thisPerson[el].science_manager_offices) {
                        vm.thisPerson[el].science_manager_offices[id]['sc_man_valid_from'] = processDate(vm.thisPerson[el].science_manager_offices[id]['sc_man_valid_from']);
                        vm.thisPerson[el].science_manager_offices[id]['sc_man_valid_until'] = processDate(vm.thisPerson[el].science_manager_offices[id]['sc_man_valid_until']);
                        vm.currentAffiliationsScMan[el].push(Object.assign({}, vm.thisPerson[el].science_manager_offices[id]));
                    }

                    vm.currentAffiliationsAdm[el] = [];
                    for (var id in vm.thisPerson[el].administrative_offices) {
                        vm.thisPerson[el].administrative_offices[id]['adm_valid_from'] = processDate(vm.thisPerson[el].administrative_offices[id]['adm_valid_from']);
                        vm.thisPerson[el].administrative_offices[id]['adm_valid_until'] = processDate(vm.thisPerson[el].administrative_offices[id]['adm_valid_until']);
                        vm.currentAffiliationsAdm[el].push(Object.assign({}, vm.thisPerson[el].administrative_offices[id]));
                    }

                    vm.currentProfessionalSituation[el] = [];
                    for (var id in vm.thisPerson[el].job_data) {
                        if (vm.thisPerson[el].job_data[id]['job_valid_from'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['job_valid_from']);
                            vm.thisPerson[el].job_data[id]['job_valid_from'] = date;
                        }
                        if (vm.thisPerson[el].job_data[id]['job_valid_until'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['job_valid_until']);
                            vm.thisPerson[el].job_data[id]['job_valid_until'] = date;
                        }
                        if (vm.thisPerson[el].job_data[id]['contract_start'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['contract_start']);
                            vm.thisPerson[el].job_data[id]['contract_start'] = date;
                        }
                        if (vm.thisPerson[el].job_data[id]['contract_end'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['contract_end']);
                            vm.thisPerson[el].job_data[id]['contract_end'] = date;
                        }
                        if (vm.thisPerson[el].job_data[id]['contract_maximum_extension'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['contract_maximum_extension']);
                            vm.thisPerson[el].job_data[id]['contract_maximum_extension'] = date;
                        }
                        if (vm.thisPerson[el].job_data[id]['fellowship_start'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['fellowship_start']);
                            vm.thisPerson[el].job_data[id]['fellowship_start'] = date;
                        }
                        if (vm.thisPerson[el].job_data[id]['fellowship_end'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['fellowship_end']);
                            vm.thisPerson[el].job_data[id]['fellowship_end'] = date;
                        }
                        if (vm.thisPerson[el].job_data[id]['fellowship_maximum_extension'] !== null) {
                            date = new Date(vm.thisPerson[el].job_data[id]['fellowship_maximum_extension']);
                            vm.thisPerson[el].job_data[id]['fellowship_maximum_extension'] = date;
                        }
                        vm.currentProfessionalSituation[el].push(Object.assign({}, vm.thisPerson[el].job_data[id]));
                    }

                    vm.currentResponsibles[el] = [];
                    for (var id in vm.thisPerson[el].responsibles) {
                        vm.thisPerson[el].responsibles[id]['valid_from'] = processDate(vm.thisPerson[el].responsibles[id]['valid_from']);
                        vm.thisPerson[el].responsibles[id]['valid_until'] = processDate(vm.thisPerson[el].responsibles[id]['valid_until']);
                        vm.currentResponsibles[el].push(Object.assign({}, vm.thisPerson[el].responsibles[id]));
                    }

                    vm.currentAffiliationsDepartment[el] = [];
                    for (var id in vm.thisPerson[el].department_data) {
                        vm.thisPerson[el].department_data[id]['department_start'] = processDate(vm.thisPerson[el].department_data[id]['department_start']);
                        vm.thisPerson[el].department_data[id]['department_end'] = processDate(vm.thisPerson[el].department_data[id]['department_end']);
                        vm.currentAffiliationsDepartment[el].push(Object.assign({}, vm.thisPerson[el].department_data[id]));
                    }

                    if (ind > -1) {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
        function getPersonDataValidate(personID, el, ind) {
            if (el === -1) {
                el = vm.nameDetailsValidate.length - 1;
            }
            personData.thisPersonData(personID)
                .then(function (response) {
                    vm.thisPersonValidate[el] = response.data.result;
                    vm.thisPersonValidate[el]['birth_date'] = processDate(vm.thisPersonValidate[el]['birth_date']);
                    vm.thisPersonValidate[el]['active_until'] = processDate(vm.thisPersonValidate[el]['active_until']);
                    vm.thisPersonValidate[el]['active_from'] = processDate(vm.thisPersonValidate[el]['active_from']);

                    if (vm.thisPersonValidate[el].pers_photo[0].personal_photo_id !== null) {
                        vm.hasPhotoValidate[el] = true;
                    }

                    for (var nat in vm.thisPersonValidate[el].nationalities) {
                        vm.selectedNationalitiesValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].nationalities[nat]));
                    }

                    if (vm.thisPersonValidate[el].pers_email[0].personal_email === null
                        || vm.thisPersonValidate[el].pers_email[0].personal_email === "") {
                        vm.hasPersonalEmailValidate[el] = false;
                    } else {
                        vm.hasPersonalEmailValidate[el] = true;
                    }

                    vm.currentFCTStatusValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].status_fct) {
                        vm.thisPersonValidate[el].status_fct[id]['valid_from'] = processDate(vm.thisPersonValidate[el].status_fct[id]['valid_from']);
                        vm.thisPersonValidate[el].status_fct[id]['valid_until'] = processDate(vm.thisPersonValidate[el].status_fct[id]['valid_until']);
                        vm.thisPersonValidate[el].status_fct[id].locked = vm.thisPersonValidate[el].status_fct[id].locked === null ? 0 : vm.thisPersonValidate[el].status_fct[id].locked;
                        vm.thisPersonValidate[el].status_fct[id].must_be_added = vm.thisPersonValidate[el].status_fct[id].must_be_added === null ? 0 : vm.thisPersonValidate[el].status_fct[id].must_be_added;
                        vm.thisPersonValidate[el].status_fct[id].must_be_removed = vm.thisPersonValidate[el].status_fct[id].must_be_removed === null ? 0 : vm.thisPersonValidate[el].status_fct[id].must_be_removed;
                        vm.thisPersonValidate[el].status_fct[id].addition_requested = vm.thisPersonValidate[el].status_fct[id].addition_requested === null ? 0 : vm.thisPersonValidate[el].status_fct[id].addition_requested;
                        vm.thisPersonValidate[el].status_fct[id].removal_requested = vm.thisPersonValidate[el].status_fct[id].removal_requested === null ? 0 : vm.thisPersonValidate[el].status_fct[id].removal_requested;
                        vm.currentFCTStatusValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].status_fct[id]));
                    }

                    vm.currentIDsValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].identifications) {
                        vm.thisPersonValidate[el].identifications[id]['card_valid_until'] = processDate(vm.thisPersonValidate[el].identifications[id]['card_valid_until']);
                        vm.currentIDsValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].identifications[id]));
                    }
                    vm.currentCarsValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].cars) {
                        vm.currentCarsValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].cars[id]));
                    }

                    vm.currentEmergencyContactsValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].emergency_contacts) {
                        vm.currentEmergencyContactsValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].emergency_contacts[id]));
                    }
                    vm.currentRolesValidate[el] = initializeRolesValidate(el);

                    vm.currentAffiliationsLabValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].lab_data) {
                        vm.thisPersonValidate[el].lab_data[id]['lab_start'] = processDate(vm.thisPersonValidate[el].lab_data[id]['lab_start']);
                        vm.thisPersonValidate[el].lab_data[id]['lab_end'] = processDate(vm.thisPersonValidate[el].lab_data[id]['lab_end']);
                        vm.thisPersonValidate[el].lab_data[id]['labs_groups_valid_from'] = processDate(vm.thisPersonValidate[el].lab_data[id]['labs_groups_valid_from']);
                        vm.thisPersonValidate[el].lab_data[id]['labs_groups_valid_until'] = processDate(vm.thisPersonValidate[el].lab_data[id]['labs_groups_valid_until']);
                        vm.thisPersonValidate[el].lab_data[id]['lab_opened'] = processDate(vm.thisPersonValidate[el].lab_data[id]['lab_opened']);
                        vm.thisPersonValidate[el].lab_data[id]['lab_closed'] = processDate(vm.thisPersonValidate[el].lab_data[id]['lab_closed']);

                        vm.currentAffiliationsLabValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].lab_data[id]));
                    }
                    vm.currentAffiliationsTechValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].technician_offices) {
                        vm.thisPersonValidate[el].technician_offices[id]['tech_valid_from'] = processDate(vm.thisPersonValidate[el].technician_offices[id]['tech_valid_from']);
                        vm.thisPersonValidate[el].technician_offices[id]['tech_valid_until'] = processDate(vm.thisPersonValidate[el].technician_offices[id]['tech_valid_until']);
                        vm.currentAffiliationsTechValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].technician_offices[id]));
                    }
                    vm.currentAffiliationsScManValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].science_manager_offices) {
                        vm.thisPersonValidate[el].science_manager_offices[id]['sc_man_valid_from'] = processDate(vm.thisPersonValidate[el].science_manager_offices[id]['sc_man_valid_from']);
                        vm.thisPersonValidate[el].science_manager_offices[id]['sc_man_valid_until'] = processDate(vm.thisPersonValidate[el].science_manager_offices[id]['sc_man_valid_until']);
                        vm.currentAffiliationsScManValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].science_manager_offices[id]));
                    }

                    vm.currentAffiliationsAdmValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].administrative_offices) {
                        vm.thisPersonValidate[el].administrative_offices[id]['adm_valid_from'] = processDate(vm.thisPersonValidate[el].administrative_offices[id]['adm_valid_from']);
                        vm.thisPersonValidate[el].administrative_offices[id]['adm_valid_until'] = processDate(vm.thisPersonValidate[el].administrative_offices[id]['adm_valid_until']);
                        vm.currentAffiliationsAdmValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].administrative_offices[id]));
                    }

                    vm.currentProfessionalSituationValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].job_data) {
                        vm.thisPersonValidate[el].job_data[id]['job_valid_from'] = processDate(vm.thisPersonValidate[el].job_data[id]['job_valid_from']);
                        vm.thisPersonValidate[el].job_data[id]['job_valid_until'] = processDate(vm.thisPersonValidate[el].job_data[id]['job_valid_until']);
                        vm.thisPersonValidate[el].job_data[id]['contract_start'] = processDate(vm.thisPersonValidate[el].job_data[id]['contract_start']);
                        vm.thisPersonValidate[el].job_data[id]['contract_end'] = processDate(vm.thisPersonValidate[el].job_data[id]['contract_end']);
                        vm.thisPersonValidate[el].job_data[id]['contract_maximum_extension'] = processDate(vm.thisPersonValidate[el].job_data[id]['contract_maximum_extension']);
                        vm.thisPersonValidate[el].job_data[id]['fellowship_start'] = processDate(vm.thisPersonValidate[el].job_data[id]['fellowship_start']);
                        vm.thisPersonValidate[el].job_data[id]['fellowship_end'] = processDate(vm.thisPersonValidate[el].job_data[id]['fellowship_end']);
                        vm.thisPersonValidate[el].job_data[id]['fellowship_maximum_extension'] = processDate(vm.thisPersonValidate[el].job_data[id]['fellowship_maximum_extension']);
                        vm.currentProfessionalSituationValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].job_data[id]));
                    }

                    vm.currentResponsiblesValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].responsibles) {
                        vm.thisPersonValidate[el].responsibles[id]['valid_from'] = processDate(vm.thisPersonValidate[el].responsibles[id]['valid_from']);
                        vm.thisPersonValidate[el].responsibles[id]['valid_until'] = processDate(vm.thisPersonValidate[el].responsibles[id]['valid_until']);
                        vm.currentResponsiblesValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].responsibles[id]));
                    }

                    vm.currentAffiliationsDepartmentValidate[el] = [];
                    for (var id in vm.thisPersonValidate[el].department_data) {
                        vm.thisPersonValidate[el].department_data[id]['department_start'] = processDate(vm.thisPersonValidate[el].department_data[id]['department_start']);
                        vm.thisPersonValidate[el].department_data[id]['department_end'] = processDate(vm.thisPersonValidate[el].department_data[id]['department_end']);
                        vm.currentAffiliationsDepartmentValidate[el].push(Object.assign({}, vm.thisPersonValidate[el].department_data[id]));
                    }
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
        function nameMatching(name1, str) {
            var name1Final = prepareString(name1);
            var strFinal = prepareString(str);
            var strSplit = strFinal.split(' ');
            for (var el in strSplit) {
                if (name1Final.match(strSplit[el]) === null) {
                    return null;
                }

            }
            return true;
        }
        function prepareString(str) {
            return str.toLowerCase()
                      .replace(/[áàãâä]/g,'a')
                      .replace(/[éèêë]/g,'e')
                      .replace(/[íìîï]/g,'i')
                      .replace(/[óòõôö]/g,'o')
                      .replace(/[úùûü]/g,'u')
                      .replace(/[ç]/g,'c')
                      .replace(/[ñ]/g,'n')
        }
        function getAllPeopleWithRoles(ind) {
            vm.loadingAllPeople = true;
            managerData.allPeopleWithRolesData()
                .then(function (response) {
                    vm.allPeople = [];
                    var rowID = 0;
                    for(var index in response.data.result) {
                        for (var indIn in response.data.result[index]) {
                            rowID++;
                            var newData = response.data.result[index][indIn];
                            newData['row_id'] = rowID;

                            if (index == 0) {
                                // for researchers
                                newData.valid_from = processDate(newData.valid_from,undefined,'YYYY-MM-DD');
                                newData.valid_until = processDate(newData.valid_until,undefined,'YYYY-MM-DD');
                                newData.labs_groups_valid_from = processDate(newData.labs_groups_valid_from,undefined,'YYYY-MM-DD');
                                newData.labs_groups_valid_until = processDate(newData.labs_groups_valid_until,undefined,'YYYY-MM-DD');
                                for (var el in vm.labs) {
                                    if (vm.labs[el].lab_id === newData.lab_id
                                        && vm.labs[el].group_id === newData.group_id) {
                                        newData['lab_row'] = vm.labs[el].lab_row;
                                        break;
                                    }
                                }
                            }
                            vm.allPeople.push(newData);
                        }
                    }
                    vm.loadingAllPeople = false;
                    vm.renderPeople();
                    if (ind !== undefined) {
                        if (ind > -1) {
                            vm.updateStatus[ind] = "Updated!";
                            vm.messageType[ind] = 'message-success';
                            vm.hideMessage[ind] = false;
                            $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
        function getAllPeopleNoRoles(ind) {
            managerData.allPeopleNoRolesData()
                .then(function (response) {
                    vm.allPeopleNoRoles = [];
                    var rowID = 0;
                    for (var indIn in response.data.result) {
                        rowID++;
                        var newData = response.data.result[indIn];
                        newData['row_id'] = rowID;
                        vm.allPeopleNoRoles.push(newData);
                    }


                    vm.renderPeople('new', true);
                    /*if (ind !== undefined) {
                        if (ind > -1) {
                            vm.updateStatus[ind] = "Updated!";
                            vm.messageType[ind] = 'message-success';
                            vm.hideMessage[ind] = false;
                            $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                        }
                    }
                    */
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
        function getAllPeopleToValidate(ind) {
            managerData.allPeopleToValidate()
                .then(function (response) {
                    vm.allPeopleValidate = [];
                    var rowID = 0;
                    for (var indIn in response.data.result) {
                        rowID++;
                        var newData = response.data.result[indIn];
                        newData['row_id'] = rowID;
                        vm.allPeopleValidate.push(newData);
                    }
                    vm.renderPeopleValidate('new');
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
        function sorter(a,b) {
            if (vm.sortType === 'valid_from' || vm.sortType === 'valid_until') {
                if (vm.sortReverse) {
                    if ((moment(a[vm.sortType]).isValid() ? moment(a[vm.sortType]) : moment(0))
                            .isBefore(moment(b[vm.sortType]).isValid() ? moment(b[vm.sortType]) : moment(0))) {
                        return 1;
                    } else if ((moment(a[vm.sortType]).isValid() ? moment(a[vm.sortType]) : moment(0))
                            .isAfter(moment(b[vm.sortType]).isValid() ? moment(b[vm.sortType]) : moment(0))) {
                        return -1;
                    }
                } else {
                    if ((moment(a[vm.sortType]).isValid() ? moment(a[vm.sortType]) : moment().add(100, 'years'))
                            .isAfter(moment(b[vm.sortType]).isValid() ? moment(b[vm.sortType]) : moment().add(100, 'years'))) {
                        return 1;
                    } else if ((moment(a[vm.sortType]).isValid() ? moment(a[vm.sortType]) : moment().add(100, 'years'))
                            .isBefore(moment(b[vm.sortType]).isValid() ? moment(b[vm.sortType]) : moment().add(100, 'years'))) {
                        return -1;
                    }
                }
            } else if (vm.sortType === 'dedication') {
                if (vm.sortReverse) {
                    if ((a[vm.sortType] ? a[vm.sortType] : 0) < (b[vm.sortType] ? b[vm.sortType] : 0)) {
                        return 1;
                    } else if ((a[vm.sortType] ? a[vm.sortType] : 0) > (b[vm.sortType] ? b[vm.sortType] : 0)) {
                        return -1;
                    }
                } else {
                    if ((a[vm.sortType] ? a[vm.sortType] : 101) > (b[vm.sortType] ? b[vm.sortType] : 101)) {
                        return 1;
                    } else if ((a[vm.sortType] ? a[vm.sortType] : 101) < (b[vm.sortType] ? b[vm.sortType] : 101)) {
                        return -1;
                    }
                }
            } else if (vm.sortType === 'role_id'
                    || vm.sortType === 'lab_id'
                    || vm.sortType === 'group_id'
                    || vm.sortType === 'unit_id') {
                if (vm.sortReverse) {
                    return -(a[vm.sortType] ? getNameFromID(a[vm.sortType],vm.sortType) : 'aa')
                        .localeCompare(b[vm.sortType] ? getNameFromID(b[vm.sortType],vm.sortType) : 'aa');
                } else {
                    return (a[vm.sortType] ? getNameFromID(a[vm.sortType],vm.sortType) : 'ZZ')
                        .localeCompare(b[vm.sortType] ? getNameFromID(b[vm.sortType],vm.sortType) : 'ZZ');
                }
            } else if (vm.sortType === 'position_id') {
                var aRoleID = a['role_id'];
                var bRoleID = b['role_id'];
                if (vm.sortReverse) {
                    return -(a[vm.sortType] ? getNameFromID(a[vm.sortType],vm.sortType, aRoleID) : 'aa')
                        .localeCompare(b[vm.sortType] ? getNameFromID(b[vm.sortType],vm.sortType, bRoleID) : 'aa');
                } else {
                    return (a[vm.sortType] ? getNameFromID(a[vm.sortType],vm.sortType, aRoleID) : 'ZZ')
                        .localeCompare(b[vm.sortType] ? getNameFromID(b[vm.sortType],vm.sortType, bRoleID) : 'ZZ');
                }
            } else {
                if (vm.sortReverse) {
                    return -(a[vm.sortType] ? a[vm.sortType] : '')
                        .localeCompare(b[vm.sortType] ? b[vm.sortType] : '');
                } else {
                    return (a[vm.sortType] ? a[vm.sortType] : '')
                        .localeCompare(b[vm.sortType] ? b[vm.sortType] : '');
                }
            }
            return 0;
        }
        function getNameFromID(id, type, rID) {
            if (type === 'role_id') {
                for (var l in vm.roles) {
                    if (vm.roles[l]['role_id'] === id) {
                        return vm.roles[l]['name_en'];
                    }
                }
            } else if (type === 'lab_id') {
                for (var l in vm.labs) {
                    if (vm.labs[l]['lab_id'] === id) {
                        return vm.labs[l]['name'];
                    }
                }
            } else if (type === 'group_id') {
                for (var g in vm.groups) {
                    if (vm.groups[g]['group_id'] === id) {
                        return vm.groups[g]['name'];
                    }
                }
            } else if (type === 'unit_id') {
                for (var u in vm.units) {
                    if (vm.units[u]['id'] === id) {
                        return vm.units[u]['name'];
                    }
                }
            } else if (type === 'position_id') {
                if (rID === 1) {
                    for (var p in vm.labPositions) {
                        if (vm.labPositions[p]['lab_position_id'] === id) {
                            return vm.labPositions[p]['name_en'];
                        }
                    }
                } else if (rID === 2) {
                    for (var p in vm.technicianPositions) {
                        if (vm.technicianPositions[p]['id'] === id) {
                            return vm.technicianPositions[p]['name_en'];
                        }
                    }
                }
            }
        }

        /* Auxiliary functions for exporting */
        function s2ab(s) {
        	if(typeof ArrayBuffer !== 'undefined') {
        		var buf = new ArrayBuffer(s.length);
        		var view = new Uint8Array(buf);
        		for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        		return buf;
        	} else {
        		var buf = new Array(s.length);
        		for (var i=0; i!=s.length; ++i) buf[i] = s.charCodeAt(i) & 0xFF;
        		return buf;
        	}
        }
        function getPosition(id, role) {
            if (id !== undefined) {
                if (role === 1) {
                    for (var ind in vm.labPositions) {
                        if (id === vm.labPositions[ind].lab_position_id) {
                            return vm.labPositions[ind].name_en;
                        }
                    }
                }
                if (role === 2) {
                    for (var ind in vm.technicianPositions) {
                        if (id === vm.technicianPositions[ind].id) {
                            return vm.technicianPositions[ind].name_en;
                        }
                    }
                }
                if (role === 3) {
                    for (var ind in vm.scienceManagementPositions) {
                        if (id === vm.scienceManagementPositions[ind].id) {
                            return vm.scienceManagementPositions[ind].name_en;
                        }
                    }
                }
                if (role === 4) {
                    for (var ind in vm.administrativePositions) {
                        if (id === vm.administrativePositions[ind].id) {
                            return vm.administrativePositions[ind].name_en;
                        }
                    }
                }
                return null;

            }
            return null;
        }
        function getGroup (id, role) {
            if (id !== undefined) {
                if (role === 1) {
                    for (var ind in vm.groups) {
                        if (id === vm.groups[ind].group_id) {
                            return vm.groups[ind].name;
                        }
                    }
                }
                return null;
            }
            return null;
        }
        function getUnit (id, role) {
            if (id !== undefined) {
                if (role === 1) {
                    for (var ind in vm.units) {
                        if (id === vm.units[ind].id) {
                            return vm.units[ind].name;
                        }
                    }
                }
                return null;
            }
            return null;
        }
        function convertData(arrObj) {
            function stringFromArrObj(thisArrObj, key, dates) {
                var str = '';
                var initial = true;
                for (var el in thisArrObj) {
                    if (thisArrObj[el][key] !== null) {
                        if (initial) {
                            str = str + thisArrObj[el][key];
                            initial = false;
                        } else {
                            str = str + ';\n' + thisArrObj[el][key];
                        }
                        if (dates !== undefined) {
                            str = str + ' (' + momentToDate(thisArrObj[el][dates[0]]) +
                                         ',' + momentToDate(thisArrObj[el][dates[1]]) + ')';
                        }
                    }
                }
                return str;
            }
            // selects data for exporting
            var data = [];
            if (arrObj.length > 0) {
                for (var el in arrObj) {
                    data.push({
                        "Person Name": arrObj[el]['person_name'],
                        "Colloquial Name": arrObj[el]['colloquial_name'],
                        "Birth Date": momentToDate(arrObj[el]['birth_date']),
                        "Gender": arrObj[el]['gender'],
                        "Position": getPosition(arrObj[el]['position_id'], arrObj[el]['role_id']),
                        "Dedication": arrObj[el]['dedication'],
                        "Lab": arrObj[el]['lab'],
                        "Group": getGroup(arrObj[el]['group_id'], arrObj[el]['role_id']),
                        "Unit": getUnit(arrObj[el]['unit_id'], arrObj[el]['role_id']),
                        "Started": momentToDate(arrObj[el]['valid_from']),
                        "Ended": momentToDate(arrObj[el]['valid_until']),
                        "Pole": arrObj[el]['pole_name'],
                        "ORCID": arrObj[el]['ORCID'],
                        "Key": arrObj[el]['association_key'],
                        "Departments": stringFromArrObj(arrObj[el]['departments'],'department'),
                        "Jobs": stringFromArrObj(arrObj[el]['jobs'],'job_category_name_en',['job_valid_from','job_valid_until']),
                        "Degrees": stringFromArrObj(arrObj[el]['degrees'],'degree_name_en',['degree_start','degree_end'])
                    });
                }
                return data;
            }
            return data;
        }
        function momentToDate(timedate, timezone, timeformat) {
            if (timezone === undefined) {
                timezone = 'Europe/Lisbon';
            }
            if (timeformat === undefined) {
                timeformat = 'YYYY-MM-DD';
            }
        return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
}
    };

/******************************** Directives **********************************/

    var usernameValidateWithoutSelf = function (personData) {
        return {
            require: 'ngModel',
            scope: {
                thisUsername: "=usernameValidateWithoutSelf"
            },
            link: function (scope, elm, attrs, ctrl) {
                personData.usernames()
                .then(function (response) {
                    var usernamesList = response.data.result;
                    ctrl.$validators.usernameValidate = function(modelValue, viewValue) {
                        if (viewValue == null) {
                            ctrl.$setValidity('username', true);
                            return true;
                        } else {
                            for (var ind in usernamesList) {
                                // if viewValue is equal to original name it should return true
                                if (viewValue === usernamesList[ind]['username']
                                        && viewValue !== scope.thisUsername) {
                                    ctrl.$setValidity('username', false);
                                    return false;
                                }
                            }
                            ctrl.$setValidity('username', true);
                            return true;
                        }
                    };
                });
            }
        };
    };

    var allPeoplePresentation = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/all_people/all.members.html'
        };
    };
    var allPeopleNoRolesPresentation = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/all_people/all.membersNoRoles.html'
        };
    };
    var listPeopleValidate = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/all_people/all.membersToValidate.html'
        };
    };

    var managerPasswordReset = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.passwordReset.html'
        };
    };
    var managerFctMctes = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.fct-mctes.html'
        };
    };
    var managerUserPermissions = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personUserPermissions.html'
        };
    };
    var managerPersonNuclearInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personNuclearInfo.html'
        };
    };
    var managerPersonContactInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personContactInfo.html'
        };
    };
    var managerPersonIdentificationsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personIdentificationsInfo.html'
        };
    };
    var managerPersonCarsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personCarsInfo.html'
        };
    };
    var managerPersonEmergencyContactsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personEmergencyContacts.html'
        };
    };
    var managerPersonInstitutionalContactsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personInstitutionalContactsInfo.html'
        };
    };
    var managerPersonCurrentRoles = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personCurrentRoles.html'
        };
    };
    var managerPersonResearcherInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personResearcherInfo.html'
        };
    };
    var managerPersonAffiliationLab = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personAffiliationLab.html'
        };
    };
    var managerPersonCostCenter = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personCostCenter.html'
        };
    };
    var managerPersonAffiliationTechnician = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personAffiliationTechnician.html'
        };
    };
    var managerPersonAffiliationManager = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personAffiliationManager.html'
        };
    };
    var managerPersonAffiliationAdministrative = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personAffiliationAdministrative.html'
        };
    };
    var managerPersonTechnicianInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personTechnicianInfo.html'
        };
    };
    var managerPersonManagerInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personManagerInfo.html'
        };
    };
    var managerPersonAdministrativeInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/roles/manager.personAdministrativeInfo.html'
        };
    };
    var managerPersonDepartment = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personDepartmentAffiliation.html'
        };
    };
    var managerPersonProfessional = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personProfessionalSituation.html'
        };
    };
    var managerPersonFinishedDegrees = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personFinishedDegrees.html'
        };
    };
    var managerPersonOngoingDegrees = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personOngoingDegrees.html'
        };
    };
    var managerPersonResponsibles = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personResponsibles.html'
        };
    };
    var managerPersonPole = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personInstitutionCity.html'
        };
    };
    var managerPersonLeft = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personLeft.html'
        };
    };
    var managerPersonPhoto = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personPhoto.html'
        };
    };
    var managerPersonAuthorNames = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/manager.personAuthorNames.html'
        };
    };
/*
    var managerPersonPublicationsLarge = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/productivity/publications/manager.person.publications.large.html'
        };
    };
    var managerPersonPublicationsSmall = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/person_details/productivity/publications/manager.person.publications.small.html'
        };
    };
*/
    var validatePerson = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.person.html'
        };
    };
    var validateUserPermissions = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personUserPermissions.html'
        };
    };
    var validateFctMctes = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.fct-mctes.html'
        };
    };
    var validatePersonNuclearInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personNuclearInfo.html'
        };
    };
    var validatePersonContactInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personContactInfo.html'
        };
    };
    var validatePersonIdentificationsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personIdentificationsInfo.html'
        };
    };
    var validatePersonCarsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personCarsInfo.html'
        };
    };
    var validatePersonEmergencyContactsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personEmergencyContacts.html'
        };
    };
    var validatePersonInstitutionalContactsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personInstitutionalContactsInfo.html'
        };
    };
    var validatePersonCurrentRoles = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personCurrentRoles.html'
        };
    };
    var validatePersonResearcherInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personResearcherInfo.html'
        };
    };
    var validatePersonAffiliationLab = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personAffiliationLab.html'
        };
    };
    var validatePersonAffiliationTechnician = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personAffiliationTechnician.html'
        };
    };
    var validatePersonAffiliationManager = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personAffiliationManager.html'
        };
    };
    var validatePersonAffiliationAdministrative = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personAffiliationAdministrative.html'
        };
    };
    var validatePersonTechnicianInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personTechnicianInfo.html'
        };
    };
    var validatePersonManagerInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personManagerInfo.html'
        };
    };
    var validatePersonAdministrativeInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/roles/validate.personAdministrativeInfo.html'
        };
    };
    var validatePersonDepartment = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personDepartmentAffiliation.html'
        };
    };
    var validatePersonProfessional = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personProfessionalSituation.html'
        };
    };
    var validatePersonFinishedDegrees = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personFinishedDegrees.html'
        };
    };
    var validatePersonOngoingDegrees = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personOngoingDegrees.html'
        };
    };
    var validatePersonResponsibles = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personResponsibles.html'
        };
    };
    var validatePersonPole = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personInstitutionCity.html'
        };
    };
    var validatePersonPhoto = function () {
        return {
            restrict: 'E',
            templateUrl: 'manager/validate_details/validate.personPhoto.html'
        };
    };

/**************************** Register components *****************************/
    angular
        .module('managementApp')
        .directive('allPeoplePresentation', allPeoplePresentation)
        .directive('allPeopleNoRolesPresentation', allPeopleNoRolesPresentation)
        .directive('managerFctMctes', managerFctMctes)
        .directive('managerPersonNuclearInfo', managerPersonNuclearInfo)
        .directive('managerPersonContactInfo', managerPersonContactInfo)
        .directive('managerPersonIdentificationsInfo', managerPersonIdentificationsInfo)
        .directive('managerPersonCarsInfo', managerPersonCarsInfo)
        .directive('managerPersonEmergencyContactsInfo', managerPersonEmergencyContactsInfo)
        .directive('managerPersonInstitutionalContactsInfo', managerPersonInstitutionalContactsInfo)
        .directive('managerPersonCurrentRoles', managerPersonCurrentRoles)
        .directive('managerPersonResearcherInfo', managerPersonResearcherInfo)
        .directive('managerPersonCostCenter', managerPersonCostCenter)
        .directive('managerPersonAffiliationLab', managerPersonAffiliationLab)
        .directive('managerPersonAffiliationTechnician', managerPersonAffiliationTechnician)
        .directive('managerPersonAffiliationManager', managerPersonAffiliationManager)
        .directive('managerPersonAffiliationAdministrative', managerPersonAffiliationAdministrative)
        .directive('managerPersonTechnicianInfo', managerPersonTechnicianInfo)
        .directive('managerPersonManagerInfo', managerPersonManagerInfo)
        .directive('managerPersonAdministrativeInfo', managerPersonAdministrativeInfo)
        .directive('managerPersonDepartment', managerPersonDepartment)
        .directive('managerPersonProfessional', managerPersonProfessional)
        .directive('managerPersonFinishedDegrees', managerPersonFinishedDegrees)
        .directive('managerPersonOngoingDegrees', managerPersonOngoingDegrees)
        .directive('managerPersonResponsibles', managerPersonResponsibles)
        .directive('managerPersonPole', managerPersonPole)
        .directive('managerPersonLeft', managerPersonLeft)
        .directive('managerPersonPhoto', managerPersonPhoto)
        .directive('managerPersonAuthorNames', managerPersonAuthorNames)
        .directive('managerUserPermissions', managerUserPermissions)

        .directive('listPeopleValidate', listPeopleValidate)
        .directive('validatePerson', validatePerson)
        .directive('validateFctMctes', validateFctMctes)
        .directive('validatePersonNuclearInfo', validatePersonNuclearInfo)
        .directive('validatePersonContactInfo', validatePersonContactInfo)
        .directive('validatePersonIdentificationsInfo', validatePersonIdentificationsInfo)
        .directive('validatePersonCarsInfo', validatePersonCarsInfo)
        .directive('validatePersonEmergencyContactsInfo', validatePersonEmergencyContactsInfo)
        .directive('validatePersonInstitutionalContactsInfo', validatePersonInstitutionalContactsInfo)
        .directive('validatePersonCurrentRoles', validatePersonCurrentRoles)
        .directive('validatePersonResearcherInfo', validatePersonResearcherInfo)
        .directive('validatePersonAffiliationLab', validatePersonAffiliationLab)
        .directive('validatePersonAffiliationTechnician', validatePersonAffiliationTechnician)
        .directive('validatePersonAffiliationManager', validatePersonAffiliationManager)
        .directive('validatePersonAffiliationAdministrative', validatePersonAffiliationAdministrative)
        .directive('validatePersonTechnicianInfo', validatePersonTechnicianInfo)
        .directive('validatePersonManagerInfo', validatePersonManagerInfo)
        .directive('validatePersonAdministrativeInfo', validatePersonAdministrativeInfo)
        .directive('validatePersonDepartment', validatePersonDepartment)
        .directive('validatePersonProfessional', validatePersonProfessional)
        .directive('validatePersonFinishedDegrees', validatePersonFinishedDegrees)
        .directive('validatePersonOngoingDegrees', validatePersonOngoingDegrees)
        .directive('validatePersonResponsibles', validatePersonResponsibles)
        .directive('validatePersonPole', validatePersonPole)
        .directive('validatePersonPhoto', validatePersonPhoto)
        .directive('validateUserPermissions', validateUserPermissions)

        .directive('managerPasswordReset', managerPasswordReset)
        .directive('usernameValidateWithoutSelf', ['personData', usernameValidateWithoutSelf])

        .controller('managerCtrl', managerCtrl)
        ;
})();