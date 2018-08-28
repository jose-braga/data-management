(function(){
/******************************* Controllers **********************************/
    var preRegCtrl = function ($scope,$routeParams,$location, $timeout,
                               Upload, personData, preRegistration, authentication) {
        var vm = this;
        vm.isLoggedIn = true;
        vm.toolbarData = {title: 'Pre-registration: submit user data'};

        vm.credentials = {
            username: $routeParams.username,
            password: $routeParams.password
        };

        preRegistration.emailFormImageNonStudent()
            .then(function (response) {
                var imgBin = response.data;
                vm.emailFormImageNonStudent = _arrayBufferToBase64(imgBin);
            })
            .catch(function (err) {
                console.log(err);
            });

        preRegistration.emailFormImageMemberRU()
            .then(function (response) {
                var imgBin = response.data;
                vm.emailFormImageMember = _arrayBufferToBase64(imgBin);
            })
            .catch(function (err) {
                console.log(err);
            });


        vm.institutionalEmail = 'Email';
        vm.requestEmail = null;

        vm.photoSize = {w: 196, h: 196};
        vm.aspectRatio = (vm.photoSize.w*1.0)/(vm.photoSize.h*1.0);

        vm.forms = {
            'preRegisterSubmit':            0
        };
        var numberCards = Object.keys(vm.forms).length; // the number of cards with "Update" in each tab
        vm.updateStatus = [];
        vm.messageType = [];
        vm.hideMessage = [];
        for (var i=0; i<numberCards; i++) {
            vm.updateStatus.push('');
            vm.messageType.push('message-updating');
            vm.hideMessage.push(true);
        }

        authentication
            .preRegister(vm.credentials)
            .then(function(){
                vm.currentUser = authentication.currentPreRegUser();
                vm.isLoggedIn = authentication.isPreRegistering();
                getPersonData(vm.currentUser.personID, -1);
                initializeImages();
                getDataLists();


            })
            .catch(function(err){
                vm.isLoggedIn = false;
                alert('Error!');
                console.log(err);
            });

        vm.institutionalEmailActions = function () {
            if (vm.requestEmail && vm.thisPerson.affiliationsDepartment.length == 0) {
                vm.addRows(vm.thisPerson.affiliationsDepartment, 'department');
                vm.addRows(vm.thisPerson.jobs, 'jobs');
            }
        };


        vm.submitPreRegistration = function (ind) {
            if (vm.thisPerson.work_email[0] === undefined && vm.requestEmail) {
                alert('Please fill in email suggestion in "Institutional Contacts"');
            } else {
                vm.updateStatus[ind] = "Updating...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;

                var data = vm.thisPerson;
                data['changed_by'] = vm.currentUser.userID;
                data['earliest_date'] = findEarliestDate();
                var department;
                var leader = {};
                if (vm.requestEmail) {
                    alert('Important:\n\n   1. Print the pdf that is going to be generated!' +
                                    '\n   2. Sign it.' +
                                    '\n   3. Deliver it to the department\'s secretary.');
                    if (vm.thisPerson.roles_data[0].role_id === 2
                            || vm.thisPerson.roles_data[0].role_id === 3
                            || vm.thisPerson.roles_data[0].role_id === 4) {
                        for (var dep in vm.departments) {
                            if (vm.thisPerson.affiliationsDepartment[0].department_id === vm.departments[dep].department_id) {
                                department = vm.departments[dep];
                                leader.name = vm.departments[dep].colloquial_name;
                                leader.email = vm.departments[dep].email;
                                leader.role = vm.departments[dep].position_name_pt;
                            }
                        }
                        generatePDF(vm.emailFormImageNonStudent,'email-request-nonStudent', department,
                            {
                                name: leader.name,
                                email: leader.email,
                                role: leader.role
                            });
                    } else {
                        var unit;
                        for (var dep in vm.units) {
                            if (vm.thisPerson.lab_data[0].unit_id === vm.units[dep].id) {
                                leader.name = vm.units[dep].colloquial_name;
                                leader.email = vm.units[dep].email;
                                leader.role = vm.units[dep].position_name_pt;
                                unit = vm.units[dep].short_name;
                            }
                        }
                        generatePDF(vm.emailFormImageMember,'email-request-member', unit,
                        {
                            name: leader.name,
                            email: leader.email,
                            role: leader.role
                        });
                    }
                }

                preRegistration.addNewPersonData(data)
                .then( function () {
                    if (vm.imagePersonPre !== '') {
                        Upload.urlToBlob(vm.imagePersonCropped)
                        .then(function(blob) {
                            var croppedImagePre = blob;
                            var croppedImageFile = new File([croppedImagePre],
                                    vm.imagePersonPre.name, {type: vm.personImageType});
                            var data = {
                                file: croppedImageFile
                            };
                            preRegistration.updatePersonPhoto(vm.currentUser.personID,1, data)
                                .then( function () {
                                    getPersonData(vm.currentUser.personID, ind);
                                    vm.changePhoto = false;
                                });
                        });
                    }
                })
                .then(function () {
                    if (ind > -1) {
                        vm.updateStatus[ind] = 'A message was sent to a manager.' +
                        'You will be notified upon successful validation.';
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () {
                            vm.hideMessage[ind] = true;
                            $location.path('/');
                        }, 5000);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            }
            return false;
        };

        vm.rolePresent = function (roleList, role) {
            for (var ind in roleList) {
                if (roleList[ind].role_name === role) return true;
            }
            return false;
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
        vm.isEmpty = function (arr) {
            if (arr.length === 0) return true;
            return false;
        };
        vm.switchValue = function (val) {
            if (val === 1 || val === true || val === 'Yes') return 'Yes';
            return 'No';
        };
        vm.nothingToShow = function (arrObj) {
            if (arrObj !== null && arrObj !== undefined) {
                if (arrObj.length === 0) return true;
                return false;
            }
            return true;
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
        vm.removeRows = function (current, ind) {
            current.splice(ind,1);
        };
        vm.addRows = function (current,type) {
            var obj = {};
            if (type === 'identifications') {
                obj = {card_id: 'new', card_type: null, card_type_id: null, card_number: null, card_valid_until: null};
                current.push(obj);
            }  else if (type === 'cars') {
                obj = {
                    id: 'new',
                    license: null, brand: null, model: null,
                    color: null, plate: null
                };
                current.push(obj);
            } else if (type === 'affiliationsLab') {
                obj = {lab_id: null, lab: null, dedication: null, lab_position_id: null,
                       group_id: null, group_name: null, start: null, end: null,
                       unit_id: null, unit: null};
                current.push(obj);
            } else if (type === 'scienceManager') {
                obj = {office_id: null, dedication: null, office_position_id: null,
                        start: null, end: null};
                current.push(obj);
            } else if (type === 'technician') {
                obj = {office_id: null, dedication: null, office_position_id: null,
                        start: null, end: null};
                current.push(obj);
            } else if (type === 'administrative') {
                obj = {office_id: null, dedication: null, office_position_id: null,
                        start: null, end: null};
                current.push(obj);
            } else if (type === 'department') {
                obj = {department_id: null, start: null, end: null};
                current.push(obj);
            } else if (type === 'responsibles') {
                obj = {responsible_id: null,
                       valid_from: null, valid_until: null};
                current.push(obj);
            } else if (type === 'jobs') {
                obj = {situation: null, category_id: null,
                       funding_agency_id: null,
                       management_entity_id: null, unit: null,
                       dedication: null, organization: null,
                       start: null, end: null, maximum_end: null};
                current.push(obj);
            } else if (type === 'fellowship') {
                obj = {fellowship_type_id: null, funding_agency_id: null,
                       management_entity_id: null, reference: null,
                      start: null, end: null, maximum_end: null};
                current.push(obj);
            } else if (type === 'contract') {
                obj = {contract_type_id: null, funding_agency_id: null,
                       management_entity_id: null, reference: null,
                      start: null, end: null, maximum_end: null};
                current.push(obj);
            } else if (type === 'volunteer') {
                obj = {start: null, end: null};
                current.push(obj);
            }
        };
        vm.departmentNames = function (department, lang) {
            var name = '';
            if (lang === undefined || lang == 'EN') {
                if (department !== undefined) {
                    if (department.department_name_en !== null) {
                        name = name + department.department_name_en + ', ';
                        name = name + department.school_shortname_en + ', ';
                        name = name + department.university_shortname_en;
                    } else if (department.school_name_en !== null) {
                        name = name + department.school_name_en + ', ';
                        name = name + department.university_shortname_en;
                    } else if (department.university_name_en !== null) {
                        name = name + department.university_name_en;
                    }
                }
            } else {
                // the other language is portuguese
                if (department !== undefined) {
                    if (department.department_name_pt !== null) {
                        name = name + department.department_name_pt + ', ';
                        name = name + department.school_shortname_pt + ', ';
                        name = name + department.university_shortname_pt;
                    } else if (department.school_name_pt !== null) {
                        name = name + department.school_name_pt + ', ';
                        name = name + department.university_shortname_pt;
                    } else if (department.university_name_pt !== null) {
                        name = name + department.university_name_pt;
                    }
                }
            }
            return name;
        };

        /* Auxiliary functions */
        function generatePDF(image, type, department, leader) {
            var doc = new jsPDF();
            doc.addImage(image,'PNG',0, 0, 210, 297);
            doc.setFontSize(10);

            var email = vm.thisPerson.work_email[0].split('@')[0];
            if (type === 'email-request-nonStudent') {
                doc.text(vm.thisPerson.name, 95, 65);
                doc.text('x', 130, 72);
                doc.text(vm.departmentNames(department, 'PT'), 106, 79);
                doc.text(vm.thisPerson.work_phone[0].phone, 86, 86);
                doc.text(vm.thisPerson.personal_email[0].personal_email, 112, 93);
                doc.text(email, 136, 103);
                // if FCT
                doc.text('x', 77.5, 124);
                // if other non-student
                doc.text('x', 77.5, 127.6);
                // contract - no term
                doc.text('x', 77.5, 145.3);
                // contract - end date
                doc.text('x', 96.3, 145.5);
                if (vm.thisPerson.jobs[0].end !== null) {
                    doc.text(momentToDate(vm.thisPerson.jobs[0].end,undefined,'DD'), 99, 145.5);
                    doc.text(momentToDate(vm.thisPerson.jobs[0].end,undefined,'MM'), 103.7, 145.5);
                    doc.text(momentToDate(vm.thisPerson.jobs[0].end,undefined,'YYYY'), 109, 145.5);
                }
                // President of DQ
                doc.text(leader.name, 95, 162.5);
                doc.text(leader.email, 100, 169.5);
                doc.text(leader.role, 84.5, 176.5);
                doc.save('correio_electronico_-_funcionario_' + vm.thisPerson.colloquialName + '.pdf');
            } else if (type === 'email-request-member') {
                doc.text(vm.thisPerson.name, 95, 61.5);
                doc.text('N/A', 100, 68.5);
                doc.text(department, 106, 75.4);
                doc.text(vm.thisPerson.work_phone[0].phone, 86, 82.4);
                doc.text(vm.thisPerson.personal_email[0].personal_email, 112, 89.3);
                doc.text(email, 136, 99.2);
                if (vm.thisPerson.jobs[0].end === null) {
                    // contract - no term
                    doc.text('x', 77.5, 120.3);
                } else {
                    // contract - end date
                    doc.text('x', 96.3, 120.3);
                    doc.text(momentToDate(vm.thisPerson.jobs[0].end,undefined,'DD'), 99, 120.3);
                    doc.text(momentToDate(vm.thisPerson.jobs[0].end,undefined,'MM'), 103.8, 120.3);
                    doc.text(momentToDate(vm.thisPerson.jobs[0].end,undefined,'YYYY'), 109, 120.3);
                }
                // President of DQ
                doc.text(leader.name, 95, 137.7);
                doc.text(leader.email, 100, 144.7);
                doc.text(leader.role, 84.5, 151.6);
                doc.save('correio_electronico_-_membro_efetivo_de_centro_' + vm.thisPerson.colloquialName + '.pdf');
            }
        }

        function findEarliestDate(){
            var dates = [];
            var minDate;
            var datesLab = [];
            var datesTech = [];
            var datesScMan = [];
            var datesAdm = [];
            var datesDep = [];
            for (var ind in vm.thisPerson.lab_data) {
                if (vm.thisPerson.lab_data[ind].lab_id !== null) {
                    if (vm.thisPerson.lab_data[ind].lab_start !== null) {
                        datesLab.push(moment(vm.thisPerson.lab_data[ind].lab_start));
                    }
                }
            }
            for (var ind in vm.thisPerson.technician_offices) {
                if (vm.thisPerson.technician_offices[ind].tech_office_id !== null) {
                    if (vm.thisPerson.technician_offices[ind].tech_valid_from !== null) {
                        datesTech.push(moment(vm.thisPerson.technician_offices[ind].tech_valid_from));
                    }
                }
            }
            for (var ind in vm.thisPerson.science_manager_offices) {
                if (vm.thisPerson.science_manager_offices[ind].sc_man_office_id !== null) {
                    if (vm.thisPerson.science_manager_offices[ind].sc_man_valid_from !== null) {
                        datesScMan.push(moment(vm.thisPerson.science_manager_offices[ind].sc_man_valid_from));
                    }
                }
            }
            for (var ind in vm.thisPerson.administrative_offices) {
                if (vm.thisPerson.administrative_offices[ind].adm_office_id !== null) {
                    if (vm.thisPerson.administrative_offices[ind].adm_valid_from !== null) {
                        datesScMan.push(moment(vm.thisPerson.administrative_offices[ind].adm_valid_from));
                    }
                }
            }
            for (var ind in vm.thisPerson.affiliationsDepartment) {
                if (vm.thisPerson.affiliationsDepartment[ind].department_id !== null) {
                    if (vm.thisPerson.affiliationsDepartment[ind].start !== null) {
                        datesDep.push(moment(vm.thisPerson.affiliationsDepartment[ind].start));
                    }
                }
            }
            dates = dates.concat(datesLab,datesTech,datesScMan,datesAdm,datesDep);
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
        function momentToDate(timedate, timezone, timeformat) {
            if (timezone === undefined) {
                timezone = 'Europe/Lisbon';
            }
            if (timeformat === undefined) {
                timeformat = 'YYYY-MM-DD';
            }
            return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
        }
        function getPersonData (personID, ind) {
            preRegistration.thisPersonData(vm.currentUser.personID)
                .then(function (response) {

                    vm.thisPerson = response.data.result;
                    for (var id in vm.thisPerson.lab_data) {
                        vm.thisPerson.lab_data[id]['lab_start'] = processDate(vm.thisPerson.lab_data[id]['lab_start']);
                        vm.thisPerson.lab_data[id]['lab_end'] = processDate(vm.thisPerson.lab_data[id]['lab_end']);
                        vm.thisPerson.lab_data[id]['labs_groups_valid_from'] = processDate(vm.thisPerson.lab_data[id]['labs_groups_valid_from']);
                        vm.thisPerson.lab_data[id]['labs_groups_valid_until'] = processDate(vm.thisPerson.lab_data[id]['labs_groups_valid_until']);
                        vm.thisPerson.lab_data[id]['lab_opened'] = processDate(vm.thisPerson.lab_data[id]['lab_opened']);
                        vm.thisPerson.lab_data[id]['lab_closed'] = processDate(vm.thisPerson.lab_data[id]['lab_closed']);
                    }
                    for (var id in vm.thisPerson.technician_offices) {
                        vm.thisPerson.technician_offices[id]['tech_valid_from'] = processDate(vm.thisPerson.technician_offices[id]['tech_valid_from']);
                        vm.thisPerson.technician_offices[id]['tech_valid_until'] = processDate(vm.thisPerson.technician_offices[id]['tech_valid_until']);
                    }
                    for (var id in vm.thisPerson.science_manager_offices) {
                        vm.thisPerson.science_manager_offices[id]['sc_man_valid_from'] = processDate(vm.thisPerson.science_manager_offices[id]['sc_man_valid_from']);
                        vm.thisPerson.science_manager_offices[id]['sc_man_valid_until'] = processDate(vm.thisPerson.science_manager_offices[id]['sc_man_valid_until']);
                    }
                    vm.currentAdmAffiliations = [];
                    for (var id in vm.thisPerson.administrative_offices) {
                        vm.thisPerson.administrative_offices[id]['adm_valid_from'] = processDate(vm.thisPerson.administrative_offices[id]['adm_valid_from']);
                        vm.thisPerson.administrative_offices[id]['adm_valid_until'] = processDate(vm.thisPerson.administrative_offices[id]['adm_valid_until']);
                    }
                    vm.thisPerson.birth_date = null;
                    vm.thisPerson.nationalities = [];
                    vm.thisPerson.identifications = [];
                    vm.thisPerson.cars = [];
                    vm.thisPerson.affiliationsDepartment = [];
                    vm.thisPerson.personal_phone = [];
                    vm.thisPerson.work_phone = [];
                    vm.thisPerson.work_email = [];
                    vm.thisPerson.jobs = [];
                    vm.thisPerson.responsibles = [];

                    if (vm.thisPerson.institution_city_name === 'Lisboa') {
                        vm.addRows(vm.thisPerson.identifications, 'identifications');
                    }

                    vm.questionRequestInstitutionalEmail = function () {
                        if (vm.thisPerson.institution_city_name === 'Lisboa') {
                            if (vm.requestEmail === true) {vm.institutionalEmail = 'Email suggestion';}
                            else {vm.institutionalEmail = 'Email';}
                            return true;
                        }
                        return false;
                    };
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
        function getDataLists() {
            personData.usernames()
                .then(function (response) {
                    var usernamesPre = response.data.result;
                    vm.usernames = [];
                    // Remove pre-defined username from this list
                    for (var ind in usernamesPre) {
                        if (usernamesPre[ind].username !== vm.currentUser.username) {
                            vm.usernames.push(usernamesPre[ind]);
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.institutionCities()
                .then(function (response) {
                    vm.institutionCities = response.data.result;
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
            personData.degreeTypes()
                .then(function (response) {
                    vm.degreeTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.units()
                .then(function (response) {
                    vm.units = response.data.result;
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
                    vm.labs = response.data.result;
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
            personData.scienceManagementOffices()
                .then(function (response) {
                    vm.scienceManagementOffices = response.data.result;
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
            personData.departments()
                .then(function (response) {
                    vm.departments = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.roles()
                .then(function (response) {
                    var rolesPre = response.data.result;
                    vm.roles = [];
                    for (var ind in rolesPre) {
                        vm.roles.push({
                            role_id: rolesPre[ind].role_id,
                            role_name: rolesPre[ind].name_en
                        });
                    }
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
            personData.technicianPositions()
                .then(function (response) {
                    vm.technicianPositions = response.data.result;
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
            personData.administrativePositions()
                .then(function (response) {
                    vm.administrativePositions = response.data.result;
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
        }
        function initializeImages() {
            vm.imagePersonPre = '';
            vm.imagePerson = '';
            vm.imagePersonCropped = '';
            $scope.$watch('vm.imagePersonPre["$ngfBlobUrl"]', function(newValue, oldValue, scope) {
                vm.imagePerson = newValue;
                vm.personImageType = vm.imagePersonPre.type;
            }, true);
        }
        function _arrayBufferToBase64(buffer) {
            var binary = '';
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }
    };


/******************************** Directives **********************************/
    var preRegistrationAdministrativeInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.administrativeInfo.html'
        };
    };
    var preRegistrationContactInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.contactInfo.html'
        };
    };
    var preRegistrationDepartment = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.departmentAffiliation.html'
        };
    };
    var preRegistrationIdentifications = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.identificationsInfo.html'
        };
    };
    var preRegistrationCars = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.carsInfo.html'
        };
    };
    var preRegistrationInstitutionalContactsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.institutionalContacts.html'
        };
    };
    var preRegistrationPersonNuclearInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.personNuclearInfo.html'
        };
    };
    var preRegistrationPhoto = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.personPhoto.html'
        };
    };
    var preRegistrationPersonRoles = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.roles.html'
        };
    };
    var preRegistrationProfessionalSituation = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.professionalSituation.html'
        };
    };
    var preRegistrationResearcherInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.researcherInfo.html'
        };
    };
    var preRegistrationResponsibles = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.responsibles.html'
        };
    };
    var preRegistrationScienceManagerInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.scienceManagerInfo.html'
        };
    };
    var preRegistrationTechnicianInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.technicianInfo.html'
        };
    };
    var preRegistrationChangePassword = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.userCreation.html'
        };
    };
    var preRegistrationComments = function () {
        return {
            restrict: 'E',
            templateUrl: 'pre-register/essential/pre-registration.comments.html'
        };
    };




/**************************** Register components *****************************/
    angular.module('managementApp')

        .directive('preRegistrationChangePassword', preRegistrationChangePassword)
        .directive('preRegistrationPersonNuclearInfo', preRegistrationPersonNuclearInfo)
        .directive('preRegistrationPhoto', preRegistrationPhoto)
        .directive('preRegistrationContactInfo', preRegistrationContactInfo)
        .directive('preRegistrationInstitutionalContactsInfo', preRegistrationInstitutionalContactsInfo)
        .directive('preRegistrationIdentifications', preRegistrationIdentifications)
        .directive('preRegistrationCars', preRegistrationCars)
        .directive('preRegistrationPersonRoles', preRegistrationPersonRoles)
        .directive('preRegistrationResearcherInfo', preRegistrationResearcherInfo)
        .directive('preRegistrationAdministrativeInfo', preRegistrationAdministrativeInfo)
        .directive('preRegistrationScienceManagerInfo', preRegistrationScienceManagerInfo)
        .directive('preRegistrationTechnicianInfo', preRegistrationTechnicianInfo)
        .directive('preRegistrationDepartment', preRegistrationDepartment)
        .directive('preRegistrationProfessionalSituation', preRegistrationProfessionalSituation)
        .directive('preRegistrationResponsibles', preRegistrationResponsibles)
        .directive('preRegistrationComments', preRegistrationComments)


        .controller('preRegCtrl', preRegCtrl)
        ;
})();

