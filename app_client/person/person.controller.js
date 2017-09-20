(function(){
/******************************* Controllers **********************************/
    var personCtrl = function ($scope, $timeout, personData, publications, authentication) {
        //TODO: add image utilities

        var vm = this;
        vm.toolbarData = {title: 'Please update your information'};
        vm.selectedTab = 0;
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.isResearcher = false;
        vm.currentRoles = [];
        vm.pluriannual = false;
        vm.integrated = false;
        vm.nuclearCV = false;
        vm.forms = {
            'personNuclear':            0,
            'personContact':            1,
            'personIdentifications':    2,
            'personEmergency':          3,
            'personFinishedDegrees':    4,
            'personOngoingDegrees':     5,
            'personInstitutional':      6,
            'personDepAffiliation':     7,
            'personRoles':              8,
            'personResInfo':            9,
            'personLabAffiliation':     10,
            'personRmResearcherRole':   12,
            'personTechnicianInfo':     13,
            'personRmTechnicianRole':   14,
            'personScManagerInfo':      15,
            'personRmScManagerRole':    16,
            'personAdmInfo':            17,
            'personRmAdmRole':          18,
            'personTechAffiliation':    19,
            'personScManAffiliation':   20,
            'personAdmAffiliation':     21,
            'personJobs':               22,
            'personResponsibles':       23
        };

        if (authentication.currentUser() == null) {

        } else {
            vm.currentUser = authentication.currentUser();
            var numberCards = Object.keys(vm.forms).length; // the number of cards with "Update" in each tab
            vm.updateStatus = [];
            vm.messageType = [];
            vm.hideMessage = [];
            for (var i=0; i<numberCards; i++) {
                vm.updateStatus.push('');
                vm.messageType.push('message-updating');
                vm.hideMessage.push(true);
            }
            getPersonData(vm.currentUser.personID, -1);
            getPublications()
            getDataLists();
        }

        vm.deleteRole = function (role, ind) {
            if (role === 'researcher') {
                if (vm.thisPerson.lab_data.length > 1) {
                    alert('Please remove your associations to labs first');
                    return false;
                } else if (vm.thisPerson.lab_data.length === 1) {
                    if (vm.thisPerson.lab_data[0].lab_id !== null
                           && vm.thisPerson.lab_data[0].lab_id !== 'new') {
                        alert('Please remove your associations to labs first');
                        return false;
                    }
                }
            }
            if (role === 'technician') {
                if (vm.thisPerson.technician_offices.length > 1) {
                    alert('Please remove your associations to facilities first');
                    return false;
                } else if (vm.thisPerson.technician_offices.length === 1) {
                    if (vm.thisPerson.technician_offices[0].tech_id !== null
                           && vm.thisPerson.technician_offices[0].tech_id !== 'new') {
                        alert('Please remove your associations to facilities first');
                        return false;
                    }
                }
            }
            if (role === 'scienceManager') {
                if (vm.thisPerson.science_manager_offices.length > 1) {
                    alert('Please remove your associations to offices first');
                    return false;
                } else if (vm.thisPerson.science_manager_offices.length === 1) {
                    if (vm.thisPerson.science_manager_offices[0].sc_man_id !== null
                           && vm.thisPerson.science_manager_offices[0].sc_man_id !== 'new') {
                        alert('Please remove your associations to offices first');
                        return false;
                    }
                }
            }
            if (role === 'administrative') {
                if (vm.thisPerson.administrative_offices.length > 1) {
                    alert('Please remove your associations to offices first');
                    return false;
                } else if (vm.thisPerson.administrative_offices.length === 1) {
                    if (vm.thisPerson.administrative_offices[0].adm_id !== null
                           && vm.thisPerson.administrative_offices[0].adm_id !== 'new') {
                        alert('Please remove your associations to offices first');
                        return false;
                    }
                }
            }
            vm.updateStatus[ind] = "Deleting...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            personData.deleteRolePersonByID(role, vm.currentUser.personID)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind, 2);
                },
                function (response) {
                    if (response.data.message.indexOf('not authorized') !== -1) {
                        vm.updateStatus[ind] = "Not authorized!";
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    } else {
                        vm.updateStatus[ind] = "Error!";
                    }
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitContactInfo = function (ind) {
            // TODO: prepare for more than 1 personal phone or email??
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "personal_address_id": vm.thisPerson.personal_address_id,
                "personal_phone_id": vm.thisPerson.pers_phone[0].personal_phone_id,
                "personal_email_id": vm.thisPerson.pers_email[0].personal_email_id,
                "address": vm.thisPerson.address,
                "postal_code": vm.thisPerson.postal_code,
                "city": vm.thisPerson.city,
                "personal_phone": vm.thisPerson.pers_phone[0].personal_phone,
                "personal_email": vm.thisPerson.pers_email[0].personal_email
            };
            personData.updateContactInfoPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    vm.updateStatus[ind] = "Updated!";
                    vm.messageType[ind] = 'message-success';
                    vm.hideMessage[ind] = false;
                    $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitEmergencyContacts = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentEmergencyContacts,vm.thisPerson.emergency_contacts,
                                  'emergency_id', 'newContacts','updateContacts','deleteContacts');
            personData.updateEmergencyContactsPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitFinishedDegrees = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentFinishedDegrees,vm.initialFinishedDegrees,
                                  'degrees_people_id', 'newDegrees','updateDegrees','deleteDegrees');
            var dataSupervisors = {};
            var dataExtSupervisors = {};
            for (var indDeg in vm.currentFinishedDegrees) {
                var currDegID = vm.currentFinishedDegrees[indDeg].degrees_people_id;
                for (var indInit in vm.initialFinishedDegrees) {
                    var initDegID = vm.initialFinishedDegrees[indInit].degrees_people_id;
                    if (currDegID === initDegID
                            && (currDegID !== null && currDegID !== 'new')
                            && (initDegID !== null && initDegID !== 'new')) {
                        var dataSup = processDataRows(vm.currentFinishedDegrees[indDeg].supervisors,vm.initialFinishedDegrees[indInit].supervisors,
                                      'degrees_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        var dataExtSup = processDataRows(vm.currentFinishedDegrees[indDeg].external_supervisors,vm.initialFinishedDegrees[indInit].external_supervisors,
                                      'degrees_ext_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        dataSupervisors[currDegID] = dataSup;
                        dataExtSupervisors[currDegID] = dataExtSup;
                    }
                }
            }
            data = {degree_data:  data,
                    degree_supervisors: dataSupervisors,
                    degree_ext_supervisors: dataExtSupervisors
            };
            personData.updateFinishedDegreesPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitIdentificationsInfo = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentIDs,vm.thisPerson.identifications,
                                  'card_id', 'newIDs','updateIDs','deleteIDs');
            personData.updateIdentificationsPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitInstitutionalContacts = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "phone_id": vm.thisPerson.work_phone[0].phone_id,
                "phone": vm.thisPerson.work_phone[0].phone,
                "extension": vm.thisPerson.work_phone[0].extension,
                "email_id": vm.thisPerson.work_email[0].email_id,
                "email": vm.thisPerson.work_email[0].email
            };
            personData.updateInstitutionalContactsPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID,ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitNuclearInfo = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var processNat = processNationalities();
            var data = {
                "name": vm.thisPerson.name,
                "colloquial_name": vm.thisPerson.colloquial_name,
                "birth_date": vm.thisPerson.birth_date,
                "gender": vm.thisPerson.gender,
                "new_nationalities": processNat.newNationalities,
                "del_nationalities": processNat.deleteNationalities,
                "user_id": vm.currentUser.userID,
                "active_from": vm.thisPerson.active_from,
                "active_until": vm.thisPerson.active_until,
                "changed_by": vm.currentUser.userID
            };
            personData.updateNuclearInfoPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID,ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitOngoingDegrees = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentOngoingDegrees,vm.initialOngoingDegrees,
                                  'degrees_people_id', 'newDegrees','updateDegrees','deleteDegrees');
            var dataSupervisors = {};
            var dataExtSupervisors = {};
            for (var indDeg in vm.currentOngoingDegrees) {
                var currDegID = vm.currentOngoingDegrees[indDeg].degrees_people_id;
                for (var indInit in vm.initialOngoingDegrees) {
                    var initDegID = vm.initialOngoingDegrees[indInit].degrees_people_id;
                    if (currDegID === initDegID
                            && (currDegID !== null && currDegID !== 'new')
                            && (initDegID !== null && initDegID !== 'new')) {
                        var dataSup = processDataRows(vm.currentOngoingDegrees[indDeg].supervisors,vm.initialOngoingDegrees[indInit].supervisors,
                                      'degrees_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        var dataExtSup = processDataRows(vm.currentOngoingDegrees[indDeg].external_supervisors,vm.initialOngoingDegrees[indInit].external_supervisors,
                                      'degrees_ext_supervisors_id', 'newSupervisors','updateSupervisors','deleteSupervisors');
                        dataSupervisors[currDegID] = dataSup;
                        dataExtSupervisors[currDegID] = dataExtSup;
                    }
                }
            }
            data = {degree_data:  data,
                    degree_supervisors: dataSupervisors,
                    degree_ext_supervisors: dataExtSupervisors
            };
            personData.updateOngoingDegreesPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAffiliationDepartment = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentAffiliationsDepartment,vm.thisPerson.department_data,
                                  'people_departments_id', 'newAffiliationsDep','updateAffiliationsDep','deleteAffiliationsDep');
            data['changed_by'] = vm.currentUser.userID;
            // finds earliest date in department and lab/techn/... affiliation
            data['earliest_date'] = findEarliestDate(vm.thisPerson, vm.currentAffiliationsDepartment, 'department');
            personData.updateAffiliationsDepartmentPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAffiliationLab = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentAffiliationsLab,vm.thisPerson.lab_data,
                                  'people_lab_id', 'newAffiliationsLab','updateAffiliationsLab','deleteAffiliationsLab');
            data['changed_by'] = vm.currentUser.userID;
            // finds earliest date in department and lab/techn/... affiliation
            data['earliest_date'] = findEarliestDate(vm.thisPerson, vm.currentAffiliationsLab, 'lab');
            personData.updateAffiliationsLabPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind, thisTab);
                },
                function (response) {
                    if (response.data.message.indexOf('not authorized') !== -1) {
                        vm.updateStatus[ind] = "Not authorized!";
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    } else {
                        vm.updateStatus[ind] = "Error!";
                    }
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitResearcherInfo = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "pluriannual":vm.thisPerson.researcher_data[0].pluriannual,
                "integrated":vm.thisPerson.researcher_data[0].integrated,
                "nuclearCV":vm.thisPerson.researcher_data[0].nuclearCV,
                "researcher_id": vm.thisPerson.researcher_data[0].researcher_id,
                "association_key": vm.thisPerson.researcher_data[0].association_key,
                "researcherID": vm.thisPerson.researcher_data[0].researcherID,
                "scopusID": vm.thisPerson.researcher_data[0].scopusID,
                "ORCID": vm.thisPerson.researcher_data[0].ORCID,
            };
            personData.updateResearcherInfoPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind, thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitTechnicianInfo = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "id": vm.thisPerson.technician_data[0].id,
                "association_key": vm.thisPerson.technician_data[0].association_key,
                "researcherID": vm.thisPerson.technician_data[0].researcherID,
                "ORCID": vm.thisPerson.technician_data[0].ORCID,
            };
            personData.updateTechnicianInfoPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind,thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitTechnicianAffiliation = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentTechnicianAffiliations,vm.thisPerson.technician_offices,
                                  'tech_id','newAffiliations','updateAffiliations','deleteAffiliations');
            data['changed_by'] = vm.currentUser.userID;
            // finds earliest date in department and lab/techn/... affiliation
            data['earliest_date'] = findEarliestDate(vm.thisPerson, vm.currentTechnicianAffiliations, 'technician');
            personData.updateTechnicianAffiliationsPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind, thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitScienceManagerInfo = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "id": vm.thisPerson.science_manager_data[0].id,
                "association_key": vm.thisPerson.science_manager_data[0].association_key,
                "researcherID": vm.thisPerson.science_manager_data[0].researcherID,
                "ORCID": vm.thisPerson.science_manager_data[0].ORCID,
            };
            personData.updateScienceManagerInfoPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind,thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitScienceManagerAffiliation = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentScManAffiliations,vm.thisPerson.science_manager_offices,
                                  'sc_man_id','newAffiliations','updateAffiliations','deleteAffiliations');
            data['changed_by'] = vm.currentUser.userID;
            // finds earliest date in department and lab/techn/... affiliation
            data['earliest_date'] = findEarliestDate(vm.thisPerson, vm.currentScManAffiliations, 'scienceManager');
            personData.updateScienceManagerAffiliationsPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind,thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAdministrativeInfo = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                "id": vm.thisPerson.administrative_data[0].id,
                "association_key": vm.thisPerson.administrative_data[0].association_key,
                "researcherID": vm.thisPerson.administrative_data[0].researcherID,
                "ORCID": vm.thisPerson.administrative_data[0].ORCID,
            };
            personData.updateAdministrativeInfoPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind,thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitAdministrativeAffiliation = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentAdmAffiliations,vm.thisPerson.administrative_offices,
                                  'adm_id', 'newAffiliations','updateAffiliations','deleteAffiliations');
            data['changed_by'] = vm.currentUser.userID;
            // finds earliest date in department and lab/techn/... affiliation
            data['earliest_date'] = findEarliestDate(vm.thisPerson, vm.currentAdmAffiliations, 'administrative');
            personData.updateAdministrativeAffiliationsPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind,thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitJobs = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentJobs,vm.thisPerson.job_data,
                                  'job_id', 'newJobs','updateJobs','deleteJobs');
            data['originalJobData'] = vm.thisPerson.job_data;
            personData.updateJobsPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    //getPersonData(vm.currentUser.personID, ind);
                    getPersonData(vm.currentUser.personID, ind, thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.submitResponsibles = function (ind) {
            //var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentResponsibles,vm.thisPerson.responsibles,
                                  'people_responsibles_id', 'newResponsibles','updateResponsibles','deleteResponsibles');
            personData.updateResponsiblesPersonByID(vm.currentUser.personID,data)
                .then( function () {
                    getPersonData(vm.currentUser.personID, ind);
                    //getPersonData(vm.currentUser.personID, ind, thisTab);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };

        vm.isRole = function (role, currRoles) {
            for (var el in currRoles) {
                if (currRoles[el].name_en === role) return true;
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
            //if (arr !== undefined) {
                if (arr.length === 0) return true;
                return false;
            //}
            //return true;
        };
        vm.switchValue = function (val) {
            if (val === 1 || val === true || val === 'Yes') return 'Yes';
            return 'No';
        };
        vm.nothingToShow = function (arrObj, key) {
            if (arrObj !== null && arrObj !== undefined) {
                if (arrObj.length === 0) return true;
                if (arrObj.length === 1 && arrObj[0][key] === null) return true;
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
            } else if (type === 'affiliationsLab') {
                if (current.length == 1 && current[0]['people_lab_id'] === null) {
                    current[0]['people_lab_id'] = 'new';
                } else {
                    obj = {people_lab_id: 'new', lab_id: null, lab: null, dedication: null, lab_position: null,
                           lab_position_id: null, group_id: null, group_name: null, lab_start: null, lab_end: null,
                           unit_id: null, unit: null};
                    current.push(obj);
                }
            } else if (type === 'technicianAffiliations') {
                if (current.length == 1 && current[0]['tech_id'] === null) {
                    current[0]['tech_id'] = 'new';
                } else {
                    obj = {tech_id: 'new',
                           tech_office_id: null, tech_office_name_en: null,
                           tech_dedication: null, tech_position_name_en: null, tech_position_id: null,
                           tech_valid_from: null, tech_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'scManAffiliations') {
                if (current.length == 1 && current[0]['sc_man_id'] === null) {
                    current[0]['sc_man_id'] = 'new';
                } else {
                    obj = {sc_man_id: 'new',
                           sc_man_office_id: null, sc_man_office_name_en: null,
                           sc_man_dedication: null, sc_man_position_name_en: null, sc_man_position_id: null,
                           sc_man_valid_from: null, sc_man_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'admAffiliations') {
                if (current.length == 1 && current[0]['adm_id'] === null) {
                    current[0]['adm_id'] = 'new';
                } else {
                    obj = {adm_id: 'new',
                           adm_office_id: null, adm_office_name_en: null,
                           adm_dedication: null, adm_position_name_en: null, adm_position_id: null,
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
                    obj = {
                        job_id: 'new',job_situation_id: null,job_situation_name_en: null,
                        job_situation_requires_unit_contract: null,job_situation_requires_fellowship: null,
                        job_category_id: null,job_category_name_en: null,
                        job_organization: null,job_dedication: null,
                        job_valid_from: null,job_valid_until: null,
                        jobs_contracts_id: null,contract_id: null,contract_reference: null,
                        contract_start: null,contract_end: null,contract_maximum_extension: null,
                        jobs_fellowships_id: null,fellowship_id: null,
                        fellowship_type_id: null,fellowship_type_name: null,
                        fellowship_type_acronym: null,fellowship_reference: null,
                        fellowship_start: null,fellowship_end: null,fellowship_maximum_extension: null,
                        fellowships_funding_agencies: null,funding_agency_id: null,
                        funding_agency_official_name: null,funding_agency_short_name: null,
                        fellowships_management_entities_id: null,management_entity_id: null,
                        management_entity_official_name: null,management_entity_short_name: null
                    };
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
            }

        };
        vm.departmentNames = function (department) {
            var name = '';
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
            return name;
        };

        /* For managing publications */


        /* Auxiliary functions */
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
                        datesLab.push(moment(thisPerson.lab_data[ind].lab_start));
                    }
                }
            }
            for (var ind in thisPerson.technician_offices) {
                if (thisPerson.technician_offices[ind].tech_id !== null) {
                    if (thisPerson.technician_offices[ind].tech_valid_from !== null) {
                        datesTech.push(moment(thisPerson.technician_offices[ind].tech_valid_from));
                    }
                }
            }
            for (var ind in thisPerson.science_manager_offices) {
                if (thisPerson.science_manager_offices[ind].sc_man_id !== null) {
                    if (thisPerson.science_manager_offices[ind].sc_man_valid_from !== null) {
                        datesScMan.push(moment(thisPerson.science_manager_offices[ind].sc_man_valid_from));
                    }
                }
            }
            for (var ind in thisPerson.administrative_offices) {
                if (thisPerson.administrative_offices[ind].adm_id !== null) {
                    if (thisPerson.administrative_offices[ind].adm_valid_from !== null) {
                        datesAdm.push(moment(thisPerson.administrative_offices[ind].adm_valid_from));
                    }
                }
            }
            for (var ind in thisPerson.department_data) {
                if (thisPerson.department_data[ind].people_departments_id !== null) {
                    if (thisPerson.department_data[ind].department_start !== null) {
                        datesDep.push(moment(thisPerson.department_data[ind].department_start));
                    }
                }
            }
            if (type === 'lab') {
                for (var ind in data) {
                    if (data[ind].people_lab_id !== null) {
                        if (data[ind].lab_start !== null) {
                            dates.push(moment(data[ind].lab_start));
                        }
                    }
                }
                dates = dates.concat(datesTech,datesScMan,datesAdm,datesDep);
            } else if (type === 'technician') {
                for (var ind in data) {
                    if (data[ind].tech_id !== null) {
                        if (data[ind].tech_valid_from !== null) {
                            dates.push(moment(data[ind].tech_valid_from));
                        }
                    }
                }
                dates = dates.concat(datesLab,datesScMan,datesAdm,datesDep);
            } else if (type === 'scienceManager') {
                for (var ind in data) {
                    if (data[ind].sc_man_id !== null) {
                        if (data[ind].sc_man_valid_from !== null) {
                            dates.push(moment(data[ind].sc_man_valid_from));
                        }
                    }
                }
                dates = dates.concat(datesLab,datesTech,datesAdm,datesDep);
            } else if (type === 'administrative') {
                for (var ind in data) {
                    if (data[ind].adm_id !== null) {
                        if (data[ind].adm_valid_from !== null) {
                            dates.push(moment(data[ind].adm_valid_from));
                        }
                    }
                }
                dates = dates.concat(datesLab,datesTech,datesScMan,datesDep);
            } else if (type === 'department') {
                for (var ind in data) {
                    if (data[ind].people_departments_id !== null) {
                        if (data[ind].department_start !== null) {
                            dates.push(moment(data[ind].department_start));
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
        function getPersonData (personID, ind, tab) {
            personData.thisPersonData(vm.currentUser.personID)
                .then(function (response) {
                    var date;
                    vm.thisPerson = response.data.result;
                    vm.pluriannual = vm.thisPerson.researcher_data[0].pluriannual;
                    vm.integrated = vm.thisPerson.researcher_data[0].integrated;
                    vm.nuclearCV = vm.thisPerson.researcher_data[0].nuclearCV;
                    if (vm.thisPerson['birth_date'] !== null) {
                        var birthDate = new Date(vm.thisPerson['birth_date']);
                        vm.thisPerson['birth_date'] = birthDate;
                    }
                    vm.selectedNationalities = [];
                    for (var nat in vm.thisPerson.nationalities) {
                        vm.selectedNationalities.push(Object.assign({}, vm.thisPerson.nationalities[nat]));
                    }
                    vm.currentIDs = [];
                    for (var id in vm.thisPerson.identifications) {
                        if (vm.thisPerson.identifications[id]['card_valid_until'] !== null) {
                            date = new Date(vm.thisPerson.identifications[id]['card_valid_until']);
                            vm.thisPerson.identifications[id]['card_valid_until'] = date;
                        }
                        vm.currentIDs.push(Object.assign({}, vm.thisPerson.identifications[id]));
                    }
                    vm.currentEmergencyContacts = [];
                    for (var id in vm.thisPerson.emergency_contacts) {
                        vm.currentEmergencyContacts.push(Object.assign({}, vm.thisPerson.emergency_contacts[id]));
                    }
                    vm.currentRolesTemp = JSON.parse(JSON.stringify(vm.thisPerson.roles_data));
                    vm.currentRoles = [];
                    for (var id in vm.currentRolesTemp) {
                        if (vm.currentRolesTemp[id].people_roles_id !== null) {
                            vm.currentRoles.push(Object.assign({},
                                {role_id: vm.currentRolesTemp[id].role_id,
                                 name_en: vm.currentRolesTemp[id].role_name}
                            ));
                        }
                    }
                    vm.currentFinishedDegrees = [];
                    vm.currentOngoingDegrees = [];
                    for (var id in vm.thisPerson.degrees) {
                        vm.thisPerson.degrees[id]['degree_start'] = processDate(vm.thisPerson.degrees[id]['degree_start']);
                        vm.thisPerson.degrees[id]['degree_estimate_end'] = processDate(vm.thisPerson.degrees[id]['degree_estimate_end']);
                        vm.thisPerson.degrees[id]['degree_end'] = processDate(vm.thisPerson.degrees[id]['degree_end']);
                        for (var id2 in vm.thisPerson.degrees[id].supervisors) {
                            vm.thisPerson.degrees[id].supervisors[id2]['valid_from'] =
                                processDate(vm.thisPerson.degrees[id].supervisors[id2]['valid_from']);
                            vm.thisPerson.degrees[id].supervisors[id2]['valid_until'] =
                                processDate(vm.thisPerson.degrees[id].supervisors[id2]['valid_until']);
                        }
                        for (var id2 in vm.thisPerson.degrees[id].external_supervisors) {
                            vm.thisPerson.degrees[id].external_supervisors[id2]['valid_from'] =
                                processDate(vm.thisPerson.degrees[id].external_supervisors[id2]['valid_from']);
                            vm.thisPerson.degrees[id].external_supervisors[id2]['valid_until'] =
                                processDate(vm.thisPerson.degrees[id].external_supervisors[id2]['valid_until']);
                        }
                        if (vm.thisPerson.degrees[id]['degree_end'] !== null) {
                            if (moment(vm.thisPerson.degrees[id]['degree_end'])
                                    .isAfter(moment())) {
                                vm.currentOngoingDegrees.push(Object.assign({}, vm.thisPerson.degrees[id]));
                            } else {
                                vm.currentFinishedDegrees.push(Object.assign({}, vm.thisPerson.degrees[id]));
                            }
                        } else {
                            vm.currentOngoingDegrees.push(Object.assign({}, vm.thisPerson.degrees[id]));
                        }
                    }
                    vm.initialFinishedDegrees = JSON.parse(JSON.stringify(vm.currentFinishedDegrees));
                    vm.initialOngoingDegrees = JSON.parse(JSON.stringify(vm.currentOngoingDegrees));
                    vm.currentAffiliationsLab = [];
                    for (var id in vm.thisPerson.lab_data) {
                        vm.thisPerson.lab_data[id]['lab_start'] = processDate(vm.thisPerson.lab_data[id]['lab_start']);
                        vm.thisPerson.lab_data[id]['lab_end'] = processDate(vm.thisPerson.lab_data[id]['lab_end']);
                        vm.currentAffiliationsLab.push(Object.assign({}, vm.thisPerson.lab_data[id]));
                    }
                    vm.currentTechnicianAffiliations = [];
                    for (var id in vm.thisPerson.technician_offices) {
                        vm.thisPerson.technician_offices[id]['tech_valid_from'] = processDate(vm.thisPerson.technician_offices[id]['tech_valid_from']);
                        vm.thisPerson.technician_offices[id]['tech_valid_until'] = processDate(vm.thisPerson.technician_offices[id]['tech_valid_until']);
                        vm.currentTechnicianAffiliations.push(Object.assign({}, vm.thisPerson.technician_offices[id]));
                    }
                    vm.currentScManAffiliations = [];
                    for (var id in vm.thisPerson.science_manager_offices) {
                        vm.thisPerson.science_manager_offices[id]['sc_man_valid_from'] = processDate(vm.thisPerson.science_manager_offices[id]['sc_man_valid_from']);
                        vm.thisPerson.science_manager_offices[id]['sc_man_valid_until'] = processDate(vm.thisPerson.science_manager_offices[id]['sc_man_valid_until']);
                        vm.currentScManAffiliations.push(Object.assign({}, vm.thisPerson.science_manager_offices[id]));
                    }
                    vm.currentAdmAffiliations = [];
                    for (var id in vm.thisPerson.administrative_offices) {
                        vm.thisPerson.administrative_offices[id]['adm_valid_from'] = processDate(vm.thisPerson.administrative_offices[id]['adm_valid_from']);
                        vm.thisPerson.administrative_offices[id]['adm_valid_until'] = processDate(vm.thisPerson.administrative_offices[id]['adm_valid_until']);
                        vm.currentAdmAffiliations.push(Object.assign({}, vm.thisPerson.administrative_offices[id]));
                    }

                    vm.currentAffiliationsDepartment = [];
                    for (var id in vm.thisPerson.department_data) {
                        if (vm.thisPerson.department_data[id].department_start !== null) {
                            date = new Date(vm.thisPerson.department_data[id].department_start);
                            vm.thisPerson.department_data[id].department_start = date;
                        }
                        if (vm.thisPerson.department_data[id].department_end !== null) {
                            date = new Date(vm.thisPerson.department_data[id].department_end);
                            vm.thisPerson.department_data[id].department_end = date;
                        }
                        vm.currentAffiliationsDepartment.push(Object.assign({}, vm.thisPerson.department_data[id]));
                    }
                    vm.currentJobs = [];
                    for (var id in vm.thisPerson.job_data) {
                        vm.thisPerson.job_data[id]['job_valid_from'] = processDate(vm.thisPerson.job_data[id]['job_valid_from']);
                        vm.thisPerson.job_data[id]['job_valid_until'] = processDate(vm.thisPerson.job_data[id]['job_valid_until']);
                        vm.thisPerson.job_data[id]['contract_start'] = processDate(vm.thisPerson.job_data[id]['contract_start']);
                        vm.thisPerson.job_data[id]['contract_end'] = processDate(vm.thisPerson.job_data[id]['contract_end']);
                        vm.thisPerson.job_data[id]['contract_maximum_extension'] = processDate(vm.thisPerson.job_data[id]['contract_maximum_extension']);
                        vm.thisPerson.job_data[id]['fellowship_start'] = processDate(vm.thisPerson.job_data[id]['fellowship_start']);
                        vm.thisPerson.job_data[id]['fellowship_end'] = processDate(vm.thisPerson.job_data[id]['fellowship_end']);
                        vm.thisPerson.job_data[id]['fellowship_maximum_extension'] = processDate(vm.thisPerson.job_data[id]['fellowship_maximum_extension']);
                        vm.currentJobs.push(Object.assign({}, vm.thisPerson.job_data[id]));
                    }
                    vm.currentResponsibles = [];
                    for (var id in vm.thisPerson.responsibles) {
                        vm.thisPerson.responsibles[id]['valid_from'] = processDate(vm.thisPerson.responsibles[id]['valid_from']);
                        vm.thisPerson.responsibles[id]['valid_until'] = processDate(vm.thisPerson.responsibles[id]['valid_until']);
                        vm.currentResponsibles.push(Object.assign({}, vm.thisPerson.responsibles[id]));
                    }
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    }
                    if(tab !== undefined) {
                        $timeout(function() {
                            vm.selectedTab = tab;
                        });
                        //vm.selectedTab = tab;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        }
        function getPublications() {
            publications.thisPersonPublications(vm.currentUser.personID)
                .then(function (response) {
                    vm.personPublications = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
        }
        function getDataLists(){
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
                    vm.roles = response.data.result;
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
        function processNationalities() {
            var newNationalities = [];
            var deleteNationalities = [];
            var existNat = 0;
            for (var selNat in vm.selectedNationalities) {
                existNat = 0;
                for (var oriNat in vm.thisPerson.nationalities) {
                    if (vm.selectedNationalities[selNat].country_id === vm.thisPerson.nationalities[oriNat].country_id) {
                        existNat = 1;
                        break;
                    }
                }
                if (existNat === 0) {
                    newNationalities.push(vm.selectedNationalities[selNat]);
                }
            }
            for (var oriNat in vm.thisPerson.nationalities) {
                for (var selNat in vm.selectedNationalities) {
                    existNat = 0;
                    if (vm.selectedNationalities[selNat].country_id === vm.thisPerson.nationalities[oriNat].country_id) {
                        existNat = 1;
                        break;
                    }
                }
                if (existNat === 0) {
                    deleteNationalities.push(vm.thisPerson.nationalities[oriNat]);
                }
            }
            return {
                newNationalities: newNationalities,
                deleteNationalities: deleteNationalities
            };
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
                        && (current[curr][keyComparison] !== null && current[curr][keyComparison] !== 'new')) {
                        exist = 1;
                        upd.push(current[curr]);
                        break;
                    }
                }
                if (exist === 0 && (current[curr][keyComparison] !== null)) {
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
    };

    var CountrySelectCtrl = function ($scope, $element, personData) {
        var count = this;
        personData.allCountries()
            .then(function (response) {
                count.countries = response.data.result;
            })
            .catch(function (err) {
                console.log(err);
            });

        count.searchTerm;
        count.clearSearchTerm = function() {
            count.searchTerm = '';
        };

        // The md-select directive eats keydown events for some quick select
        // logic. Since we have a search input here, we don't need that logic.
        $element.find('input').on('keydown', function(ev) {
            ev.stopPropagation();
        });

    };

    var LabSelectCtrl = function ($scope, $element, personData) {
        var laboratory = this;

        laboratory.searchTerm;
        laboratory.clearSearchTerm = function() {
            laboratory.searchTerm = '';
        };

        // The md-select directive eats keydown events for some quick select
        // logic. Since we have a search input here, we don't need that logic.
        $element.find('input').on('keydown', function(ev) {
            ev.stopPropagation();
        });
    };

    var PeopleSelectCtrl = function ($scope, $element, personData) {
        var peop = this;
        // CREATE all people service
        personData.allPeople()
            .then(function (response) {
                peop.people = response.data.result;
            })
            .catch(function (err) {
                console.log(err);
            });

        peop.searchTerm;
        peop.clearSearchTerm = function() {
            peop.searchTerm = '';
        };

        // The md-select directive eats keydown events for some quick select
        // logic. Since we have a search input here, we don't need that logic.
        $element.find('input').on('keydown', function(ev) {
            ev.stopPropagation();
        });

    };

/******************************** Directives **********************************/

    var personAffiliationLab = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/researcher/person.affiliationLab.html'
        };
    };
    var personAffiliationDepartment = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/institutional/person.affiliationDepartment.html'
        };
    };
    var personContactInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/personal/person.contactInfo.html'
        };
    };
    var personEmergencyContacts = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/personal/person.emergencyInfo.html'
        };
    };
    var personFinishedDegrees = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/academic/person.finishedDegrees.html'
        };
    };
    var personIdentificationsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/personal/person.identificationsInfo.html'
        };
    };
    var personInstitutionalContacts = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/institutional/person.institutionalContacts.html'
        };
    };
    var personNuclearInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/personal/person.nuclearInfo.html'
        };
    };
    var personResearcherInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/researcher/person.researcherInfo.html'
        };
    };
    var personTechnicianInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/technician/person.technicianInfo.html'
        };
    };
    var personTechnicianAffiliation = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/technician/person.technicianAffiliation.html'
        };
    };
    var personScManagerInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/scienceManager/person.scienceManagerInfo.html'
        };
    };
    var personScManagerAffiliation = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/scienceManager/person.scienceManagerAffiliation.html'
        };
    };
    var personAdmInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/administrative/person.administrativeInfo.html'
        };
    };
    var personAdmAffiliation = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/administrative/person.administrativeAffiliation.html'
        };
    };
    var personRoles = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/institutional/person.roles.html'
        };
    };
    var personOngoingDegrees = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/academic/person.ongoingDegrees.html'
        };
    };
    var personProfessional = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/professional/person.professionalSituation.html'
        };
    };
    var personResponsible = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/professional/person.responsible.html'
        };
    };
    var personPublications = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/publications/person.publications.html'
        };
    };
    var personPublicationDetail = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/publications/person.publicationDetail.html'
        };
    };

    var personPoles = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/institutional/person.institutionCity.html'
        };
    };

    // to check that postal codes are properly formed
    var postalCodeValidate = function () {
        return {
            require: 'ngModel',
            link: function (scope, elm, attrs, ctrl) {
                ctrl.$validators.postalCodeValidate = function(modelValue, viewValue) {
                    if (viewValue == null) {
                        ctrl.$setValidity('postalFormat', true);
                        return true;
                    } else {
                        if (viewValue.match(/\d\d\d\d-\d\d\d/)) {
                            ctrl.$setValidity('postalFormat', true);
                            return true;
                        } else if (viewValue.match(/\d\d\d\d.+/)) {
                            ctrl.$setValidity('postalFormat', false);
                            return false;
                        } else if (viewValue.match(/\d\d\d\d/)) {
                            ctrl.$setValidity('postalFormat', true);
                            return true;
                        }
                        ctrl.$setValidity('postalFormat', false);
                        return false;
                    }
                };
            }
        };
    };

    var dedicationValidate = function () {
        return {
            require: 'ngModel',
            link: function (scope, elm, attrs, ctrl) {
                var filterInt = function(value) {
                    if (/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
                        return Number(value);
                    }
                    return NaN;
                };
                ctrl.$validators.dedicationValidate = function(modelValue, viewValue) {
                    if (viewValue == null) {
                        ctrl.$setValidity('dedication', true);
                        return true;
                    } else {
                        if (isNaN(filterInt(viewValue))) {
                            ctrl.$setValidity('dedication', false);
                            return false;
                        } else if (filterInt(viewValue)<=0 || filterInt(viewValue)>100) {
                            ctrl.$setValidity('dedication', false);
                            return false;
                        } else {
                            ctrl.$setValidity('dedication', true);
                            return true;
                        }
                    }
                };
            }
        };
    };

/**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('personAffiliationLab', personAffiliationLab)
        .directive('personAffiliationDepartment', personAffiliationDepartment)
        .directive('personContactInfo', personContactInfo)
        .directive('personEmergencyContacts', personEmergencyContacts)
        .directive('personFinishedDegrees', personFinishedDegrees)
        .directive('personIdentificationsInfo', personIdentificationsInfo)
        .directive('personNuclearInfo', personNuclearInfo)
        .directive('personResearcherInfo', personResearcherInfo)
        .directive('personTechnicianInfo', personTechnicianInfo)
        .directive('personTechnicianAffiliation', personTechnicianAffiliation)
        .directive('personScManagerInfo', personScManagerInfo)
        .directive('personScManagerAffiliation', personScManagerAffiliation)
        .directive('personAdmInfo', personAdmInfo)
        .directive('personAdmAffiliation', personAdmAffiliation)
        .directive('personRoles', personRoles)
        .directive('personOngoingDegrees', personOngoingDegrees)
        .directive('personInstitutionalContacts', personInstitutionalContacts)
        .directive('personProfessional', personProfessional)
        .directive('personResponsible', personResponsible)
        .directive('personPoles', personPoles)
        .directive('personPublications', personPublications)
        .directive('personPublicationDetail', personPublicationDetail)

        .directive('postalCodeValidate', postalCodeValidate)
        .directive('dedicationValidate', dedicationValidate)
        .controller('personCtrl', personCtrl)
        .controller('CountrySelectCtrl', CountrySelectCtrl)
        .controller('LabSelectCtrl', LabSelectCtrl)
        .controller('PeopleSelectCtrl', PeopleSelectCtrl)
        ;
})();
