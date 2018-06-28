(function(){
/******************************* Controllers **********************************/
    var personCtrl = function ($scope, $timeout, $mdMedia, $mdDialog,
                               Upload, personData, publications, authentication) {

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
            'personResponsibles':       23,
            'personPhoto':              24,
            'personSelectedPub':        25,
            'personPubDetails':         26,
            'personAuthorNames':        27,
            'personCostCenter':         28,
            'personPubRemove':          29,
            'personPubAdd':             30,
            'personORCIDAdd':           31,
            'personUpdateComm':         32,
            'personCommRemove':         33,
            'personCommORCIDAdd':       34,
            'personCommAdd':            35,
            'personResearchInterests':  36,
            'personURLs':               37,
            'personPatents':            38,
            'personOutreaches':         39,
            'personDatasets':           40,
            'personPrizes':             41,
            'personStartups':           42,
            'personBoards':             43,
            'personProjects':           44,
            'personCars':               45

        };
        vm.changePhoto = false;
        vm.photoSize = {w: 196, h: 196};
        vm.aspectRatio = (vm.photoSize.w*1.0)/(vm.photoSize.h*1.0);

        vm.progressORCID = false;

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
            getDataLists();
            initializeImages();
            initializeDetails();
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
        vm.submitCarsInfo = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentCars,vm.thisPerson.cars,
                                  'id', 'newCars','updateCars','deleteCars');
            personData.updateCarsPersonByID(vm.currentUser.personID,data)
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
        vm.submitURLs = function(ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentURLs,vm.thisPerson.pers_url,
                                  'personal_url_id', 'newURL','updateURL','deleteURL');

            personData.updateURLsPersonByID(vm.currentUser.personID,data)
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
        vm.submitResearchInterests = function(ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentResearchInterests,vm.thisPerson.research_interests,
                                  'research_interest_id', 'newRI','updateRI','deleteRI');
            personData.updateResearchInterestsPersonByID(vm.currentUser.personID,data)
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

            // for each affiliation check overlaps with lab history
            // generating a DB line for each overlap
            var submitAffiliations = [];

            for (var el in vm.currentAffiliationsLab) {
                // find the lab data to which this affiliation refers to
                for (var elLab in vm.labs) {
                    if (vm.labs[elLab].lab_id === vm.currentAffiliationsLab[el].lab_id) {
                        var indLab = elLab;
                        break;
                    }
                }
                var addedFirstHistory = false;
                for (var elHist in vm.labs[indLab].lab_history) {
                    var overlap = timeOverlap(vm.currentAffiliationsLab[el].lab_start,
                                              vm.currentAffiliationsLab[el].lab_end,
                                              vm.labs[indLab].lab_history[elHist].labs_groups_valid_from,
                                              vm.labs[indLab].lab_history[elHist].labs_groups_valid_until);
                    if (overlap) {
                        var thisData = Object.assign({},vm.currentAffiliationsLab[el]);
                        thisData.lab_start = overlap[0];
                        thisData.lab_end = overlap[1];
                        if (addedFirstHistory){
                            thisData.people_lab_id = 'new';
                            submitAffiliations.push(thisData);
                        } else {
                            addedFirstHistory = true;
                            submitAffiliations.push(thisData);
                        }
                    }
                }
            }
            var data = processDataRows(submitAffiliations,vm.thisPerson.lab_data,
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
        vm.submitCostCenters = function (ind) {
            var thisTab = vm.selectedTab;
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentCostCenters,vm.thisPerson.cost_centers,
                                  'people_cost_centers_id', 'newCostCenters','updateCostCenters','deleteCostCenters');
            personData.updateCostCentersPersonByID(vm.currentUser.personID,data)
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
        vm.submitPersonPhoto = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            Upload.urlToBlob(vm.imagePersonCropped)
                .then(function(blob) {
                    var croppedImagePre = blob;
                    var croppedImageFile = new File([croppedImagePre],
                            vm.imagePersonPre.name, {type: vm.personImageType});
                    var data = {
                        file: croppedImageFile
                    };
                    personData.updatePersonPhoto(vm.currentUser.personID,1, data)
                        .then( function () {
                            getPersonData(vm.currentUser.personID, ind);
                            vm.changePhoto = false;
                        },
                        function () {
                            vm.updateStatus[ind] = "Error!";
                            vm.messageType[ind] = 'message-error';
                        },
                        function () {}
                        );
                    return false;

                });
        };
        vm.submitAuthorNames = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = {
                addAuthorNames: vm.newAuthorNames,
                delAuthorNames: vm.delAuthorNames
            };
            publications.updateAuthorNamesPerson(vm.currentUser.personID,data)
                .then( function () {
                    //getPersonData(vm.currentUser.personID, ind);
                    getPersonData(vm.currentUser.personID, ind);
                    initializeVariables();
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
        vm.isPorto = function() {
            if (vm.thisPerson.institution_city_name === 'Porto') {
                return true;
            }
            return false;
        };
        vm.labNames = function(lab) {
            if (lab !== undefined) {
                var name = lab.lab;
                if (processDate(lab.lab_opened) !== null && processDate(lab.lab_closed) === null) {
                    name = name + ' (started ' + momentToDate(lab.lab_opened) + ')';
                } else if (processDate(lab.lab_opened) === null && processDate(lab.lab_closed) !== null) {
                    name = name + ' (closed ' + momentToDate(lab.lab_closed) + ')';
                } else if (processDate(lab.lab_opened) !== null && processDate(lab.lab_closed) !== null) {
                    name = name + ' (from ' + momentToDate(lab.lab_opened) + ' to ' + momentToDate(lab.lab_closed) + ')';
                }
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
        vm.updateOnSelect = function (arrObj, source, num, keyID, keyUpd) {
            for (var el in source) {
                if (source[el][keyID] === arrObj[num][keyID]) {
                    for (var indKey in keyUpd) {
                        if (keyUpd[indKey] === 'lab_opened') {
                            arrObj[num][keyUpd[indKey]] = processDate(source[el]['started']);
                        } else if (keyUpd[indKey] === 'lab_closed') {
                            arrObj[num][keyUpd[indKey]] = processDate(source[el]['finished']);
                        } else {
                            arrObj[num][keyUpd[indKey]] = source[el][keyUpd[indKey]];
                        }
                    }
                }
            }
        };
        vm.currentFinishedDegrees = function (current, ind) {
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
            } else if (type === 'costCenters') {
                if (current.length == 1 && current[0]['people_cost_centers_id'] === null) {
                    current[0]['people_cost_centers_id'] = 'new';
                } else {
                    obj = {people_cost_centers_id: 'new', cost_center_id: null,
                           short_name: null, name: null, valid_from: null, valid_until: null};
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
            } else if (type === 'urls') {
                if (current.length == 1 && current[0]['personal_url_id'] === null) {
                    current[0]['personal_url_id'] = 'new';
                } else {
                    obj = {personal_url_id:'new',
                        personal_url: null,
                        url_type_id: null,
                        url_type: null,
                        description: null
                    };
                    current.push(obj);
                }
            } else if (type === 'researchInterests') {
                if (current.length == 1 && current[0]['research_interest_id'] === null) {
                    current[0]['research_interest_id'] = 'new';
                } else {
                    obj = {research_interest_id:'new',
                        interests: null, sort_order:null};
                    current.push(obj);
                }
            } else if (type === 'affiliationsLab') {
                if (current.length == 1 && current[0]['people_lab_id'] === null) {
                    current[0]['people_lab_id'] = 'new';
                } else {
                    obj = {people_lab_id: 'new', lab_id: null, lab: null, dedication: null, lab_position: null,
                           lab_position_id: null, lab_opened: null, lab_closed: null, group_id: null, group_name: null, lab_start: null, lab_end: null,
                           unit_id: null, unit: null};
                    current.push(obj);
                }
            } else if (type === 'technicianAffiliations') {
                if (current.length == 1 && current[0]['tech_id'] === null) {
                    current[0]['tech_id'] = 'new';
                } else {
                    obj = {tech_id: 'new', tech_unit_id: null,
                           tech_office_id: null, tech_office_name_en: null,
                           tech_dedication: null, tech_position_name_en: null, tech_position_id: null,
                           tech_valid_from: null, tech_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'scManAffiliations') {
                if (current.length == 1 && current[0]['sc_man_id'] === null) {
                    current[0]['sc_man_id'] = 'new';
                } else {
                    obj = {sc_man_id: 'new', sc_man_unit_id: null,
                           sc_man_office_id: null, sc_man_office_name_en: null,
                           sc_man_dedication: null, sc_man_position_name_en: null, sc_man_position_id: null,
                           sc_man_valid_from: null, sc_man_valid_until: null};
                    current.push(obj);
                }
            } else if (type === 'admAffiliations') {
                if (current.length == 1 && current[0]['adm_id'] === null) {
                    current[0]['adm_id'] = 'new';
                } else {
                    obj = {adm_id: 'new', adm_unit_id: null,
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
            } else if (type === 'patents') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: [],
                        patent_id: null,
                        patent_type_id: null,
                        patent_type_name: null,
                        status_date: null,
                        authors_raw: null,
                        title: null,
                        reference1: null,
                        reference2: null,
                        patent_status_id: null,
                        patent_status_name: null,
                        description: null
                    };
                    current.push(obj);
                }
            } else if (type === 'prizes') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: [],
                        recipients: null,
                        prize_id: null,
                        name: null,
                        organization: null,
                        year: null,
                        amount_euro: null,
                        notes: null
                    };
                    current.push(obj);
                }
            } else if (type === 'datasets') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: [],
                        data_set_id: null,
                        data_set_type_id: null,
                        short_description: null,
                        number_sets: null,
                        database_name: null,
                        url: null,
                        year: null
                    };
                    current.push(obj);
                }
            } else if (type === 'startups') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: [{person_id: vm.currentUser.personID, position_name: null}],
                        startup_id: null,
                        short_description: null,
                        name: null,
                        start: null,
                        end: null
                    };
                    current.push(obj);
                }
            } else if (type === 'startup_people') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {person_id: null, position_name: null};
                    current.push(obj);
                }
            } else if (type === 'boards') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: vm.currentUser.personID,
                        board_id: null,
                        board_type_id: null,
                        board_name: null,
                        short_description: null,
                        role: null,
                        international: 0,
                        start_date: null,
                        end_date: null
                    };
                    current.push(obj);
                }
            } else if (type === 'outreaches') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: vm.currentUser.personID,
                        outreach_id: null,
                        name: null,
                        description: null,
                        international: 0,
                        event_date: null
                    };
                    current.push(obj);
                }
            } else if (type === 'cars') {
                if (current.length == 1 && current[0]['id'] === null) {
                    current[0]['id'] = 'new';
                } else {
                    obj = {
                        id: 'new',
                        person_id: vm.currentUser.personID,
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
        vm.removeRows = function (current, ind) {
            current.splice(ind,1);
        };
        vm.addAuthorName = function (chip) {
            for (var el in vm.thisPerson.author_data) {
                if (typeof vm.thisPerson.author_data[el] === 'string') {
                    vm.thisPerson.author_data[el] = {};
                    vm.thisPerson.author_data[el].author_name = chip;
                    vm.thisPerson.author_data[el].author_name_id = 'new';
                    vm.newAuthorNames.push(vm.thisPerson.author_data[el]);
                    break;
                }
            }
        };
        vm.removeAuthorName = function (chip) {
            var toRemove = true;
            for (var el in vm.newAuthorNames) {
               if (vm.newAuthorNames[el].author_name_id === 'new'
                        && vm.newAuthorNames[el].author_name === chip.author_name) {
                    vm.newAuthorNames.splice(el,1);
                    toRemove = false;
                    break;
                }
            }
            if (toRemove) vm.delAuthorNames.push(chip);

        };

        vm.initializeAcademic = function () {
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


        };
        vm.initializeInstitutional = function () {
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
            personData.institutionCities()
                .then(function (response) {
                    vm.institutionCities = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
        };
        vm.initializeRoles = function () {
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
            personData.labPositions()
                .then(function (response) {
                    vm.labPositions = response.data.result;
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
        };
        vm.initializeProfessional = function () {
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

        vm.changePhotoAction = function () {
            vm.changePhoto = true;
        };

        /* For managing publications */
        vm.submitSelectedPersonPublications = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processSelectedPub(vm.personPublications,vm.originalPersonPublications);
            publications.updateSelectedPublications(vm.currentUser.personID,data)
                .then( function () {
                    getPublications();
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
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
        vm.submitPublicationRemoval = function(ind) {
            if (vm.deletePublications.length > 0) {
                alert("This won't remove the publications from the database." +
                  "\nIt will simply remove your connection to these publications" +
                  "\n (e.g. you are not the author, published while on another institution).");
                vm.updateStatus[ind] = "Updating...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;
                var data = {deletePublications: vm.deletePublications};
                publications.removePublicationsPerson(vm.currentUser.personID,data)
                    .then( function () {
                        initializeDetails();
                        getPublications(ind);
                        if (ind > -1) {
                            vm.updateStatus[ind] = "Updated!";
                            vm.messageType[ind] = 'message-success';
                            vm.hideMessage[ind] = false;
                            $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
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
        vm.submitAddPublications = function(ind) {
            if (vm.addPublications.length > 0) {
                vm.updateStatus[ind] = "Updating...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;
                var data = {addPublications: vm.addPublications};
                publications.addPublicationsPerson(vm.currentUser.personID,data)
                    .then( function () {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                        getPublications(-1);
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
        vm.submitAddORCIDPublications = function(ind) {
            if (vm.addPublicationsORCID.length > 0) {
                var incomplete = false;
                for (var indPub in vm.addPublicationsORCID) {
                    if (vm.addPublicationsORCID[indPub].journal_name === null
                        || vm.addPublicationsORCID[indPub].journal_name === undefined
                        || vm.addPublicationsORCID[indPub].journal_name === ''
                        || vm.addPublicationsORCID[indPub].authors_raw === null
                        || vm.addPublicationsORCID[indPub].authors_raw === undefined
                        || vm.addPublicationsORCID[indPub].authors_raw === '') {
                        incomplete = true;
                        break;
                    }
                }
                if (incomplete) {
                    alert('You must define authors and journal/book names for all chosen publications before submitting.');
                } else {
                    vm.updateStatus[ind] = "Updating...";
                    vm.messageType[ind] = 'message-updating';
                    vm.hideMessage[ind] = false;
                    var data = {addPublications: vm.addPublicationsORCID};
                    publications.addORCIDPublicationsPerson(vm.currentUser.personID,data)
                        .then( function () {
                            vm.updateStatus[ind] = "Updated!";
                            vm.messageType[ind] = 'message-success';
                            vm.hideMessage[ind] = false;
                            $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                            getPublications(-1);
                        },
                        function () {
                            vm.updateStatus[ind] = "Error!";
                            vm.messageType[ind] = 'message-error';
                        },
                        function () {}
                        );
                }
            } else {
                alert('There are no publications in the list of publications to be added to database.');
            }
            return false;
        };
        vm.connectORCID = function() {
            vm.progressORCID = true;
            var orcid;
            if (vm.thisPerson.researcher_data[0].ORCID !== null) {
                orcid = vm.thisPerson.researcher_data[0].ORCID;
            } else if (vm.thisPerson.technician_data[0].ORCID !== null) {
                orcid = vm.thisPerson.technician_data[0].ORCID;
            } else if (vm.thisPerson.science_manager_data[0].ORCID !== null) {
                orcid = vm.thisPerson.science_manager_data[0].ORCID;
            } else {
                orcid = null;
            }
            if (orcid === null) {
                alert('Please insert your ORCID in your role data');
            } else {
                publications.getORCIDPublicationsPerson(orcid)
                .then(function (response) {
                    var data = response.data.group;
                    vm.allORCIDPublicationsPrior = readORCIDData(data);
                    // filtering for all published works (journal articles, conference papers)
                    var printedORCID = vm.allORCIDPublicationsPrior.filter(function (el){
                            if (el.type === null) return true; //because we don't know if it is printed or not
                            if (el.type === 'LECTURE_SPEECH') return false;
                            if (el.type === 'CONFERENCE_POSTER') return false;
                            if (el.type === 'CONFERENCE_PAPER') return false;
                            return true;
                        });
                    // removes all publications from ORCID that are already in DB
                    vm.allORCIDPublications = removeExistingORCID(printedORCID,vm.allPublicationsPrior);
                    vm.progressORCID = false;
                })
                .catch(function (err) {
                    console.log(err);
                });
            }
        };

        vm.initializeCommunications = function () {
            vm.sortType='date';
            vm.sortReverse=true;
            personData.communicationTypes()
                .then(function (response) {
                    vm.communicationTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.conferenceTypes()
                .then(function (response) {
                    vm.conferenceTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });

            getCommunications();
        };
        vm.showDetailsORCID = function (pub) {
            publications.getORCIDDetailsPublication(pub.path)
                .then(function (response) {
                    processDetailsORCID(pub,response.data);
                })
                .catch(function (err) {
                    console.log(err);
                });

        };
        vm.addPublicationPerson = function(publication) {
            var found = false;
            for (var ind in vm.addPublications) {
                if (vm.addPublications[ind].id === publication.id)
                {
                    found = true;
                    break;
                }
            }
            if (!found) {
                vm.addPublications.push(publication);
            }

        };
        vm.addORCIDDatabase = function(publication) {
            var found = false;
            for (var ind in vm.addPublicationsORCID) {
                if (vm.addPublicationsORCID[ind].doi !== null) {
                    if (vm.addPublicationsORCID[ind].doi === publication.doi)
                    {
                        found = true;
                        break;
                    }
                } else {
                    if (vm.addPublicationsORCID[ind].title === publication.title)
                    {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                vm.addPublicationsORCID.push(publication);
            }

        };
        vm.getSearchResults = function(title, authors) {
            if (title === undefined) title = '';
            if (authors === undefined) authors = '';
            title = title.toLowerCase();
            authors = authors.toLowerCase();
            vm.filteredAllPublications = [];
            if (title.length > 3 || authors.length > 3) {
                var titleSplit = title
                                    .split(' ');
                var authorsSplit = authors
                                    .split(' ');
                for (var ind in vm.allPublications) {
                    var pubTitle;
                    var pubAuthors;
                    if (vm.allPublications[ind].title !== null && vm.allPublications[ind].title !==undefined) {
                        pubTitle = vm.allPublications[ind].title.toLowerCase();
                    } else {
                        pubTitle = '';
                    }
                    if (vm.allPublications[ind].authors_raw !== null && vm.allPublications[ind].authors_raw !==undefined) {
                        pubAuthors = vm.allPublications[ind].authors_raw.toLowerCase();
                    } else {
                        pubAuthors = '';
                    }
                    var selectByTitle = false;
                    var selectByAuthors = false;
                    var countTitle = 0;
                    var countAuthors = 0;
                    for (var indTitle in titleSplit) {
                        if (pubTitle.indexOf(titleSplit[indTitle]) !== -1) countTitle++;
                    }
                    if (countTitle === titleSplit.length) selectByTitle = true;
                    for (var indAut in authorsSplit) {
                        if (pubAuthors.indexOf(authorsSplit[indAut]) !== -1) countAuthors++;
                    }
                    if (countAuthors === authorsSplit.length) selectByAuthors = true;
                    if (selectByTitle && selectByAuthors) {
                        vm.filteredAllPublications.push(vm.allPublications[ind]);
                    }
                }
            }
        };
        vm.getAllPublications = function() {
            // gets all publications from DB and excludes the ones that are already attributed to you
            vm.sortType = 'year';
            vm.progressORCID = false;
            vm.addPublications = [];

            vm.allORCIDPublications = [];
            vm.publicationDetailsORCID = [];
            vm.addPublicationsORCID = [];

            vm.allPublicationsSearchTitle = '';
            vm.allPublicationsSearchAuthors = '';
            publications.allPublications()
                .then(function (response) {
                    vm.allPublicationsPrior = response.data.result;
                    vm.allPublications = [];
                    for (var ind in vm.allPublicationsPrior) {
                        var found = false;
                        for (var indMine in vm.personPublications) {
                            if (vm.allPublicationsPrior[ind].id === vm.personPublications[indMine].id) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) vm.allPublications.push(vm.allPublicationsPrior[ind]);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        };
        vm.showTable = function () {
            return $mdMedia('min-width: 1440px');
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
            vm.renderPublications('new');
        };
        vm.renderPublications = function (str) {
            if (str === 'new') {
                vm.currentPage = 1;
            }
            vm.totalPublications = vm.personPublications.length;
            vm.selectedPublications = [];
            var toInclude = 0;
            var toIncludeDueFrom = 0;
            var toIncludeDueTo = 0;
            vm.fromYearPub = parseInt(vm.fromYearPub,10);
            vm.toYearPub = parseInt(vm.toYearPub,10);
            for (var ind in vm.personPublications) {
                toInclude = 0;
                toIncludeDueFrom = 0;
                toIncludeDueTo = 0;
                if (Number.isInteger(vm.fromYearPub)) {
                    if (vm.fromYearPub <= vm.personPublications[ind].year) {
                       toIncludeDueFrom = 1;
                    }
                } else {
                    toIncludeDueFrom = 1;
                }
                if (Number.isInteger(vm.toYearPub)) {
                    if (vm.toYearPub >= vm.personPublications[ind].year) {
                       toIncludeDueTo = 1;
                    }
                } else {
                    toIncludeDueTo = 1;
                }
                toInclude = toIncludeDueFrom * toIncludeDueTo;
                if (toInclude === 1) {
                    vm.selectedPublications.push(vm.personPublications[ind]);
                }
            }
            vm.totalFromSearch = vm.selectedPublications.length;

            vm.totalPages = Math.ceil(vm.totalFromSearch / vm.pageSize);
            vm.pages = [];
            for (var num=1; num<=vm.totalPages; num++) {
                vm.pages.push(num);
            }
            // Sort selectedPeople according to defined order, before
            // defining page contents
            vm.selectedPublications = vm.selectedPublications.sort(sorter);
            vm.currPublications = [];
            for (var member = (vm.currentPage - 1) * vm.pageSize;
                    member < vm.currentPage * vm.pageSize && member < vm.totalFromSearch;
                    member++) {
                vm.currPublications.push(Object.assign({}, vm.selectedPublications[member]));
            }
        };
        vm.changeSelectedStatus = function (pub) {
            for (var ind in vm.personPublications) {
                if (pub.people_publications_id === vm.personPublications[ind].people_publications_id) {
                    vm.personPublications[ind].selected = pub.selected;
                    break;
                }
            }
        };
        vm.changePublicStatus = function (pub) {
            for (var ind in vm.personPublications) {
                if (pub.people_publications_id === vm.personPublications[ind].people_publications_id) {
                    vm.personPublications[ind].public = pub.public;
                    break;
                }
            }
        };
        vm.showDetailsPublication = function (pub) {
            if (vm.pubTitles.indexOf(pub.title) === -1) {
                vm.pubTitles.push(pub.title);
                var authors = pub.authors_raw.split('; ');
                for (var ind in pub.unit_authors) {
                    // - 1 to convert from position to array index
                    if (pub.unit_authors[ind].position !== null && pub.unit_authors[ind].position !== undefined) {
                        authors[pub.unit_authors[ind].position - 1] = authors[pub.unit_authors[ind].position - 1] + '^';
                        if (pub.unit_authors[ind].author_type_id === 1) {
                            authors[pub.unit_authors[ind].position - 1] = authors[pub.unit_authors[ind].position - 1] + '(corresp.)';
                        }
                    }
                }
                var authors_str = '';
                for (var ind in authors) {
                    if (ind > 0) {
                        authors_str = authors_str + '; ' + authors[ind];
                    } else {
                        authors_str = authors_str + authors[ind];
                    }
                }
                pub['authors'] = authors_str;
                for (var ind in pub.publication_type) {
                    if (ind > 0) {
                        pub['doc_type'] = pub['doc_type'] + '; ' + pub.publication_type[ind].name_en;
                    } else {
                        pub['doc_type'] = pub.publication_type[ind].name_en;
                    }
                }
                var if_last_year;
                for (var ind in pub.impact_factors) {
                    if (ind > 0) {
                        if (if_last_year.year < pub.impact_factors[ind].year) {
                            if_last_year = pub.impact_factors[ind];
                        }
                    } else {
                        if_last_year = pub.impact_factors[ind];
                    }
                }
                pub['if_last_year'] = if_last_year;
                vm.thisPublication.push(pub);
            }
        };
        vm.closeTabs = function () {
            initializeDetails();
        };
        vm.exportPublicationsSpreadsheet = function() {
            var type = 'xlsx';
            var wsName = 'Data';
            var wb = {};
            var selectedPublications = convertData(vm.selectedPublications);
            var ws = XLSX.utils.json_to_sheet(selectedPublications);
            wb.SheetNames = [wsName];
            wb.Sheets = {};
            wb.Sheets[wsName] = ws;
            var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
            var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
            var from;
            var to;
            if (vm.fromYearPub === undefined || isNaN(vm.fromYearPub)) {
                from = 'all';
            } else {
                from = vm.fromYearPub;
            }
            if (vm.toYearPub === undefined || isNaN(vm.toYearPub)) {
                to = 'all';
            } else {
                to = vm.toYearPub;
            }
            var fname = 'my_publications_' + from + '_' + to
                        + '_' + dateTime + '.' + type;
            try {
            	saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), fname);
            } catch(e) { if(typeof console != 'undefined') console.log(e, wbout); }
        };
        vm.removePublication = function(publication) {
            for(var ind in vm.personPublications){
                if (vm.personPublications[ind].people_publications_id === publication.people_publications_id) {
                    vm.personPublications.splice(ind,1);
                    vm.deletePublications.push(publication);
                    break;
                }
            }
            vm.renderPublications('');
        };

        vm.initializePublications = function () {
            vm.sortType='year';
            vm.sortReverse=false;
            personData.publicationTypes()
                .then(function (response) {
                    vm.publicationTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.authorTypes()
                .then(function (response) {
                    vm.authorTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            getPublications();
        };
        function getPublications(ind) {
            publications.thisPersonPublications(vm.currentUser.personID)
                .then(function (response) {
                    vm.personPublications = response.data.result;
                    for (var el in vm.personPublications) {
                        if (vm.personPublications[el].selected === 1) {
                            vm.personPublications[el].selected = true;
                        } else {
                            vm.personPublications[el].selected = false;
                        }
                        if (vm.personPublications[el].public === 1) {
                            vm.personPublications[el].public = true;
                        } else {
                            vm.personPublications[el].public = false;
                        }
                    }
                    vm.originalPersonPublications = JSON.parse(JSON.stringify(vm.personPublications));
                    initializeVariables();
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    } else if (ind === -1) {
                        vm.getSearchResults('','');
                        vm.getAllPublications();
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
        function readORCIDData(data) {
            var publications = [];
            for (var ind in data) {
                var info = data[ind]['work-summary'][0];
                var pub = {};
                var title = null;
                if (info.hasOwnProperty('title')) {
                    if (info['title'] !== null && info.title.hasOwnProperty('title')) {
                        if (info.title.title.hasOwnProperty('value')) {
                            title = info.title.title.value;
                        }
                    }
                }
                pub.title = title.trim();
                var doi = null;
                if (info.hasOwnProperty('external-ids')) {
                    if (info['external-ids'] !== null) {
                        if (info['external-ids'].hasOwnProperty('external-id')) {
                            for (var indExt in info['external-ids']['external-id']) {
                                if (info['external-ids']['external-id'][indExt]['external-id-type'] === 'doi') {
                                    doi = info['external-ids']['external-id'][indExt]['external-id-value'];
                                }
                            }
                        }
                    }
                }
                pub.doi = doi;
                var year = null;
                var month = null;
                var day = null;
                if (info.hasOwnProperty('publication-date')) {
                    if (info['publication-date'] !== null) {
                        if (info['publication-date'].hasOwnProperty('year')) {
                            if (info['publication-date']['year'] !== null) {
                                if (info['publication-date']['year'].hasOwnProperty('value')) {
                                    year = info['publication-date']['year']['value'];
                                }
                            }
                        }
                        if (info['publication-date'].hasOwnProperty('month')) {
                            if (info['publication-date']['month'] !== null) {
                                if (info['publication-date']['month'].hasOwnProperty('value')) {
                                    month = info['publication-date']['month']['value'];
                                }
                            }
                        }
                        if (info['publication-date'].hasOwnProperty('day')) {
                            if (info['publication-date']['day'] !== null) {
                                if (info['publication-date']['day'].hasOwnProperty('value')) {
                                    day = info['publication-date']['day']['value'];
                                }
                            }
                        }
                    }
                }
                pub.year = year;
                pub.month = month;
                pub.day = day;
                var path = null; // variable that holds the link to the publication details
                if (info.hasOwnProperty('path')) {
                    path = info.path;
                }
                pub.path = path;
                var type = null;
                if (info.hasOwnProperty('type')) {
                    type = info.type;
                }
                pub.type = type;
                pub.detailProgress = false;
                publications.push(pub);
            }
            return publications;
        }
        function processDetailsORCID(pub, data) {
            pub.edit_authors = true;
            pub.edit_journal = true;
            pub.edit_vol = true;
            var journal = null;
            if (data.hasOwnProperty('journal-title')) {
                if (data['journal-title'] !== null && data['journal-title'].hasOwnProperty('value')) {
                    journal = data['journal-title']['value'];
                }
            }
            if (journal !== null) {
                journal = journal.replace(/&amp;/g,'&');
                pub.edit_journal = false;
            }
            pub.journal_name = journal;
            var contributors = [];
            if (data.hasOwnProperty('contributors')) {
                if (data['contributors'] !== null && data['contributors'].hasOwnProperty('contributor')) {
                    for (var ind in data.contributors.contributor) {
                        if (data.contributors.contributor[ind].hasOwnProperty('credit-name')) {
                            if (data.contributors.contributor[ind]['credit-name'] !== null
                                && data.contributors.contributor[ind]['credit-name'].hasOwnProperty('value')) {
                                if (data.contributors.contributor[ind]['credit-name'].value !== null) {
                                    contributors.push(data.contributors.contributor[ind]['credit-name'].value);
                                }
                            }
                        }
                    }
                }
            }
            var volume = null;
            var number = null; //this is used by some journals
            var pages = null;
            var authors = null;
            if (data.hasOwnProperty('citation')) {
                //from this we can get authors, volume, pages
                if (data.citation !== null && data.citation.hasOwnProperty('citation-type')) {
                    if (data.citation['citation-type'] === 'BIBTEX') {
                        if (data.citation['citation-value'] !== null) {
                            var vol = data.citation['citation-value'].match(/volume = {(.*?)}/);
                            if (vol !== null) volume = vol[1];
                            var num = data.citation['citation-value'].match(/number = {(.*?)}/);
                            if (num !== null) number = num[1];
                            var pg = data.citation['citation-value'].match(/pages = {(.*?)}/);
                            if (pg !== null) pages = pg[1];
                            var aut = data.citation['citation-value'].match(/author = {(.*?)}/);
                            if (aut !== null) authors = aut[1];
                            var j = data.citation['citation-value'].match(/journal = {(.*?)}/);
                            if (journal === null) {
                                if (j !== null) {
                                    journal = j[1];
                                    pub.journal_name = journal;
                                    pub.edit_journal = false;
                                }
                            }
                        }
                    } else {
                        alert('This data is not in an automatically parsed format (Bibtex), please add additional info below\nData format: ' + data.citation['citation-type']);
                    }
                }
            }
            if (volume === null || number === null || pages === null) {
                pub.edit_vol = true;
            }
            pub.volume = volume;
            pub.number = number;
            pub.pages = pages;
            if (contributors.length ===0) {
                if (authors !== null && authors !== '') {
                    pub.authors_raw = authors;
                } else {
                    pub.edit_authors = true;
                }

            } else {
                var strAuthors = '';
                for (var ind in contributors) {
                    if (ind > 0) strAuthors = strAuthors + '; ';
                    strAuthors = strAuthors + contributors[ind];
                }
                pub.authors_raw = strAuthors
                            .replace(/\.\s/g, '')
                            .replace(/\./g, '');
            }
            vm.publicationDetailsORCID.push(pub);
        }
        function removeExistingORCID(dataORCID, dataDB) {
            var publications = [];
            var titleORCID, titleDB;
            for (var ind in dataORCID) {
                var found = false;
                for (var indDB in dataDB) {
                    // first DOI is compared, if there is no DOI then compares title
                    if (dataORCID[ind].doi !== null) {
                        if (dataDB[indDB].doi !== null) {
                            if (dataORCID[ind].doi.toLowerCase() == dataDB[indDB].doi.toLowerCase()) {
                                // already in database => skip
                                found = true;
                                break;
                            }
                        } else {
                            titleORCID = dataORCID[ind].title
                                    .toLowerCase()
                                    .replace(/[\-;,:]/g,'');
                            titleDB = dataDB[indDB].title
                                    .toLowerCase()
                                    .replace(/[\-;,:]/g,'');
                            // compare titles
                            if (titleORCID == titleDB) {
                                // already in database => skip
                                found = true;
                                break;
                            }
                        }
                    } else {
                        // compare titles
                        titleORCID = dataORCID[ind].title
                                .toLowerCase()
                                .replace(/[\-;,:]/g,'');
                        titleDB = dataDB[indDB].title
                                .toLowerCase()
                                .replace(/[\-;,:]/g,'');
                        // compare titles
                        if (titleORCID == titleDB) {
                            // already in database => skip
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    publications.push(dataORCID[ind]);
                }
            }
            return publications;
        }

        /* For managing communications and other productivity */
        vm.submitPersonCommunications = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processChangedComm(vm.personCommunications,vm.originalPersonCommunications);
            publications.updateCommunicationsPerson(vm.currentUser.personID,{upd: data})
                .then( function () {
                    getCommunications();
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
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
        vm.submitAddORCIDCommunications = function(ind) {
            if (vm.addCommunicationsORCID.length > 0) {
                vm.updateStatus[ind] = "Updating...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;
                var data = {add: vm.addCommunicationsORCID};
                publications.addORCIDCommunicationsPerson(vm.currentUser.personID,data)
                    .then( function () {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                        getCommunications(-1);
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
        vm.submitAddCommunications = function(ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            if (!vm.communicationDetails.international) {
                vm.communicationDetails.country_id={};
                vm.communicationDetails.country_id.country_id = 184;
                vm.communicationDetails.international = false;
            }
            var data = {add: [vm.communicationDetails]};
            publications.addCommunicationsPerson(vm.currentUser.personID,data)
                .then( function () {
                    vm.communicationsDetails = {};
                    vm.updateStatus[ind] = "Updated!";
                    vm.messageType[ind] = 'message-success';
                    vm.hideMessage[ind] = false;
                    $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    getCommunications(-1);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.connectCommORCID = function() {
            vm.progressORCID = true;
            var orcid;
            if (vm.thisPerson.researcher_data[0].ORCID !== null) {
                orcid = vm.thisPerson.researcher_data[0].ORCID;
            } else if (vm.thisPerson.technician_data[0].ORCID !== null) {
                orcid = vm.thisPerson.technician_data[0].ORCID;
            } else if (vm.thisPerson.science_manager_data[0].ORCID !== null) {
                orcid = vm.thisPerson.science_manager_data[0].ORCID;
            } else {
                orcid = null;
            }
            if (orcid === null) {
                alert('Please insert your ORCID in your role data');
            } else {
                // this will get all your works on ORCID
                publications.getORCIDPublicationsPerson(orcid)
                .then(function (response) {
                    var data = response.data.group;
                    vm.allORCIDWorksPrior = readORCIDData(data);
                    // filtering for all non-article works (talks, posters,...)
                    var commORCID = vm.allORCIDWorksPrior.filter(function (el){
                            if (el.type === null) return true; //because we don't know if it is a communication or not
                            if (el.type === 'LECTURE_SPEECH') return true;
                            if (el.type === 'CONFERENCE_POSTER') return true;
                            // as per ORCID, a CONFERENCE_PAPER is not published in scholarly journals
                            if (el.type === 'CONFERENCE_PAPER') return true;
                            return false;
                        });
                    vm.allORCIDCommunications = removeExistingComm(commORCID,vm.personCommunications);
                    vm.progressORCID = false;
                })
                .catch(function (err) {
                    console.log(err);
                });
            }
        };
        vm.showCommDetailsORCID = function (pub) {
            publications.getORCIDDetailsPublication(pub.path)
                .then(function (response) {
                    processCommDetailsORCID(pub,response.data);
                })
                .catch(function (err) {
                    console.log(err);
                });

        };

        vm.renderCommunications = function (str) {
            if (str === 'new') {
                vm.currentPageCommunications = 1;
            }
            vm.totalCommunications = vm.personCommunications.length;
            vm.selectedCommunications = [];
            var toInclude = 0;
            var toIncludeDueFrom = 0;
            var toIncludeDueTo = 0;
            vm.fromYearComm = parseInt(vm.fromYearComm,10);
            vm.toYearComm = parseInt(vm.toYearComm,10);
            for (var ind in vm.personCommunications) {
                toInclude = 0;
                toIncludeDueFrom = 0;
                toIncludeDueTo = 0;
                if (Number.isInteger(vm.fromYearComm)) {
                    if (vm.fromYearComm <= moment(vm.personCommunications[ind].date).year()) {
                       toIncludeDueFrom = 1;
                    }
                } else {
                    toIncludeDueFrom = 1;
                }
                if (Number.isInteger(vm.toYearComm)) {
                    if (vm.toYearComm >= moment(vm.personCommunications[ind].date).year()) {
                       toIncludeDueTo = 1;
                    }
                } else {
                    toIncludeDueTo = 1;
                }
                toInclude = toIncludeDueFrom * toIncludeDueTo;
                if (toInclude === 1) {
                    vm.selectedCommunications.push(vm.personCommunications[ind]);
                }
            }
            vm.totalFromSearchCommunications = vm.selectedCommunications.length;

            vm.totalPagesCommunications = Math.ceil(vm.totalFromSearchCommunications / vm.pageSizeCommunications);
            vm.pagesCommunications = [];
            for (var num=1; num<=vm.totalPagesCommunications; num++) {
                vm.pagesCommunications.push(num);
            }
            // Sort selectedPeople according to defined order, before
            // defining page contents
            vm.selectedCommunications = vm.selectedCommunications.sort(sorter);
            vm.currCommunications = [];
            for (var member = (vm.currentPageCommunications - 1) * vm.pageSizeCommunications;
                    member < vm.currentPageCommunications * vm.pageSizeCommunications && member < vm.totalFromSearchCommunications;
                    member++) {
                vm.currCommunications.push(Object.assign({}, vm.selectedCommunications[member]));
            }
        };
        vm.communicationAuthorsList = function (str, num, type) {
            var authors = str.split(';');
            if (type === undefined) {
                vm.communicationDetailsORCID[num].presenters = [];
                for (var ind in authors) {
                    vm.communicationDetailsORCID[num].presenters.push(authors[ind].trim());
                }
            } else {
                vm.communicationDetails.presenters = [];
                for (var ind in authors) {
                    vm.communicationDetails.presenters.push(authors[ind].trim());
                }
            }
        };
        vm.communicationORCIDintoDatabase = function(work) {
            var found = false;
            for (var ind in vm.addCommunicationsORCID) {
                if (vm.addCommunicationsORCID[ind].title === work.title
                    && vm.addCommunicationsORCID[ind].conference === work.conference
                    && vm.addCommunicationsORCID[ind].type === work.type)
                {
                        found = true;
                        break;
                }
            }
            if (!found) {
                if (!work.international) {
                    work.country_id={};
                    work.country_id.country_id = 184;
                    work.international = false;
                }
                vm.addCommunicationsORCID.push(work);
            }

        };
        vm.removeCommunicationORCID = function(work,num) {
            // remove from final list
            for (var ind in vm.addCommunicationsORCID) {
                if (vm.addCommunicationsORCID[ind].title === work.title
                    && vm.addCommunicationsORCID[ind].conference === work.conference
                    && vm.addCommunicationsORCID[ind].type === work.type)
                {
                    vm.addCommunicationsORCID.splice(ind,1);
                    break;
                }
            }
            // remove from details list
            vm.communicationDetailsORCID.splice(num,1);


        };
        vm.showDetailsCommunication = function (work, pubNum) {
            var authors = work.authors_raw.split(';');
            authors = authors.map(function (el) { return el.trim(); });
            var config = {
                parent: angular.element(document.body),
                controller: commDetailsCtrl,
                controllerAs: 'ctrl',
                templateUrl: 'person/productivity/communications/person.communicationsDetail.html',
                locals: {work: work, vm: vm, pubNum: pubNum, presenters: authors},
                bindToController: true,
                clickOutsideToClose: true,
                escapeToClose: true
            };
            $mdDialog.show(config)
                .then(function (ans) {
                    // the details dialog has no action, so code is run only when closed(i.e. cancelled)
                },
                    function () {
                        for (var ind in vm.currCommunications) {
                            for (var ind_ori in vm.personCommunications) {
                                if (vm.currCommunications[ind].id == vm.personCommunications[ind_ori].id) {
                                    vm.personCommunications[ind_ori] = vm.currCommunications[ind];
                                }
                            }
                        }
                });
        };
        vm.changePublicStatusComm = function (work) {
            for (var ind in vm.personCommunications) {
                if (work.id === vm.personCommunications[ind].id) {
                    vm.personCommunications[ind].public = work.public;
                    break;
                }
            }
        };
        vm.exportCommunicationsSpreadsheet = function() {
            var type = 'xlsx';
            var wsName = 'Data';
            var wb = {};
            var selectedCommunications = convertDataCommunications(vm.selectedCommunications);
            var ws = XLSX.utils.json_to_sheet(selectedCommunications);
            wb.SheetNames = [wsName];
            wb.Sheets = {};
            wb.Sheets[wsName] = ws;
            var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
            var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
            var from = vm.fromYearComm;
            var to = vm.toYearComm;
            if (vm.fromYearComm === undefined || isNaN(vm.fromYearComm)) {
                from = 'all';
            }
            if (vm.toYearComm === undefined || isNaN(vm.toYearComm)) {
                to = 'all';
            }
            var fname = 'my_communications_' + from + '_' + to
                        + '_' + dateTime + '.' + type;
            try {
            	saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), fname);
            } catch(e) { if(typeof console != 'undefined') console.log(e, wbout); }
        };

        function getCommunications(ind) {
            publications.thisPersonCommunications(vm.currentUser.personID)
                .then(function (response) {
                    vm.personCommunications = response.data.result;
                    // remove below
                    for (var el in vm.personCommunications) {
                        if (vm.personCommunications[el].international === 1) {
                            vm.personCommunications[el].international = true;
                        } else {
                            vm.personCommunications[el].international = false;
                        }
                        if (vm.personCommunications[el].public === 1) {
                            vm.personCommunications[el].public = true;
                        } else {
                            vm.personCommunications[el].public = false;
                        }
                    }
                    vm.originalPersonCommunications = [];
                    for (var el in vm.personCommunications) {
                        vm.originalPersonCommunications.push(JSON.parse(JSON.stringify(vm.personCommunications[el])));
                    }

                    initializeVariablesCommunications();
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Updated!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () { vm.hideMessage[ind] = true; }, 1500);
                    } else if (ind === -1) {
                        vm.connectCommORCID();
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        }
        function processCommDetailsORCID(pub, data) {
            pub.edit_date = true;
            if (pub.year !== null && pub.month !== null && pub.day !== null) {
                pub.date = pub.year + '-' + pub.month + '-' + pub.day;
                pub.edit_date = false;
            }
            if (data.hasOwnProperty('citation')) {
                //from this we can get authors, volume, pages
                if (data.citation !== null && data.citation.hasOwnProperty('citation-value')) {
                    if (data.citation['citation-value'] !== null) {
                        var citation = data.citation['citation-value'];
                        pub.authors_raw = citation;
                        pub.conference = citation;
                        pub.presenters = [citation];
                    }
                }
            }
            for (var ind in vm.communicationTypes) {
                var typeName = vm.communicationTypes[ind].name.toUpperCase().replace(' ','_');
                if (typeName == pub.type) {
                    pub.communication_type_id = vm.communicationTypes[ind].id;
                }
            }
            vm.communicationDetailsORCID.push(pub);
        }
        function removeExistingComm(dataORCID, dataDB) {
            var communications  = [];
            var titleORCID, titleDB, commTypeDB;
            for (var ind in dataORCID) {
                var found = false;
                for (var indDB in dataDB) {
                    // first DOI is compared, if there is no DOI then compares titles and types

                    if (dataORCID[ind].doi !== null) {
                        if (dataDB[indDB].doi !== null) {
                            if (dataORCID[ind].doi.toLowerCase() == dataDB[indDB].doi.toLowerCase()) {
                                // already in database => skip
                                found = true;
                                break;
                            }
                        } else {
                            titleORCID = dataORCID[ind].title
                                    .toLowerCase()
                                    .replace(/[\s\-;,:\+]/g,'');
                            titleDB = dataDB[indDB].title
                                    .toLowerCase()
                                    .replace(/[\s\-;,:\+]/g,'');
                            commTypeDB = dataDB[indDB].communication_type_name
                                    .toUpperCase()
                                    .replace(' ','_');
                            // compare titles and types
                            if (titleORCID == titleDB && dataORCID[ind].type == commTypeDB) {
                                // already in database => skip
                                found = true;
                                break;
                            }
                        }
                    } else {
                        // compare titles and types
                        titleORCID = dataORCID[ind].title
                                .toLowerCase()
                                .replace(/[\s\-;,:\+]/g,'');
                        titleDB = dataDB[indDB].title
                                .toLowerCase()
                                .replace(/[\s\-;,:\+]/g,'');
                        commTypeDB = dataDB[indDB].communication_type_name
                                    .toUpperCase()
                                    .replace(' ','_');
                        // compare titles
                        if (titleORCID == titleDB  && dataORCID[ind].type == commTypeDB) {
                            // already in database => skip
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    communications.push(dataORCID[ind]);
                }
            }
            return communications;
        }
        function processChangedComm(current, original) {
            var upd = [];
            for (var curr in current) {
                for (var ori in original) {
                    if (current[curr].id == original[ori].id) {
                        if (JSON.stringify(current[curr]) != JSON.stringify(original[ori])) {
                            upd.push(current[curr]);
                        }
                    }
                }
            }
            return upd;
        }

        vm.initializePatents = function () {
            vm.sortType='status_date';
            vm.sortReverse=true;
            personData.patentTypes()
                .then(function (response) {
                    vm.patentTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.patentStatus()
                .then(function (response) {
                    vm.patentStatus = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            getPatents();
        };
        function getPatents(ind) {
            publications.getAllPatents()
                .then(function (response) {
                    vm.allPatents = response.data.result;
                    for (var id in vm.allPatents) {
                        vm.allPatents[id]['status_date'] = processDate(vm.allPatents[id]['status_date']);
                    }
                    for (var el in vm.allPatents) {
                        var p_id = [];
                        for (var el2 in vm.allPatents[el].person_id) {
                            if (vm.allPatents[el].person_id[el2] !== null) {
                                p_id.push(vm.allPatents[el].person_id[el2]);
                            }
                        }
                        vm.allPatents[el].person_id = p_id;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            publications.thisPersonPatents(vm.currentUser.personID)
                .then(function (response) {
                    vm.originalPersonPatents = response.data.result;
                    vm.currentPatents = [];
                    for (var id in vm.originalPersonPatents) {
                        vm.originalPersonPatents[id]['status_date'] = processDate(vm.originalPersonPatents[id]['status_date']);
                        vm.currentPatents.push(Object.assign({}, vm.originalPersonPatents[id]));
                    }

                    vm.originalPersonPatents = vm.originalPersonPatents.sort(sorter);
                    vm.currentPatents = vm.currentPatents.sort(sorter);

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
        vm.submitPatents = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;

            // Add yourself to the list of new/update patents

            var data = processDataRows(vm.currentPatents,vm.originalPersonPatents,
                                  'id', 'newPatent','updatePatent','deletePatent');

            for (var el in data.updatePatent) {
                if (data.updatePatent[el].person_id.indexOf(vm.currentUser.personID) === -1) {
                    data.updatePatent[el].person_id.push(vm.currentUser.personID);
                }
            }
            for (var el in data.newPatent) {
                if (data.newPatent[el].person_id.indexOf(vm.currentUser.personID) === -1) {
                    data.newPatent[el].person_id.push(vm.currentUser.personID);
                }
            }
            publications.updatePatentsPerson(vm.currentUser.personID,data)
                .then( function () {
                    getPatents(ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.renderPatents = function () {
            vm.patentsToShow = [];
            if (vm.searchPatent.length >2) {
                for (var el in vm.allPatents) {
                    if (nameMatching(vm.allPatents[el].title,vm.searchPatent) !== null) {
                        vm.patentsToShow.push(vm.allPatents[el]);
                    }
                }
            }
        };
        vm.addPatentSearch = function (patent) {
            var alreadExists = false;
            for (var el in vm.currentPatents) {
                if (vm.currentPatents[el].title == patent.title) {
                    alreadExists = true;
                }
            }
            if (!alreadExists) {
                patent.id = 'new association';
                vm.originalPersonPatents.push(Object.assign({}, patent));
                vm.currentPatents.push(Object.assign({}, patent));
            }
        };

        vm.initializePrizes = function () {
            vm.sortType='year';
            vm.sortReverse=false;
            getPrizes();
        };
        function getPrizes(ind) {
            publications.getAllPrizes()
                .then(function (response) {
                    vm.allPrizes = response.data.result;
                    for (var el in vm.allPrizes) {
                        var p_id = [];
                        for (var el2 in vm.allPrizes[el].person_id) {
                            if (vm.allPrizes[el].person_id[el2] !== null) {
                                p_id.push(vm.allPrizes[el].person_id[el2]);
                            }
                        }
                        vm.allPrizes[el].person_id = p_id;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            publications.thisPersonPrizes(vm.currentUser.personID)
                .then(function (response) {
                    vm.originalPersonPrizes = response.data.result;
                    vm.originalPersonPrizes = vm.originalPersonPrizes.sort(sorter);
                    vm.currentPrizes = [];
                    for (var id in vm.originalPersonPrizes) {
                        vm.currentPrizes.push(Object.assign({}, vm.originalPersonPrizes[id]));
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
        vm.submitPrizes = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;

            var data = processDataRows(vm.currentPrizes,vm.originalPersonPrizes,
                                  'id', 'newPrize','updatePrize','deletePrize');
            for (var el in data.updatePrize) {
                if (data.updatePrize[el].person_id.indexOf(vm.currentUser.personID) === -1) {
                    data.updatePrize[el].person_id.push(vm.currentUser.personID);
                }
            }
            for (var el in data.newPrize) {
                if (data.newPrize[el].person_id.indexOf(vm.currentUser.personID) === -1) {
                    data.newPrize[el].person_id.push(vm.currentUser.personID);
                }
            }
            publications.updatePrizesPerson(vm.currentUser.personID,data)
                .then( function () {
                    getPrizes(ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.renderPrizes = function () {
            vm.prizesToShow = [];
            if (vm.searchPrize.length >2) {
                for (var el in vm.allPrizes) {
                    if (nameMatching(vm.allPrizes[el].name,vm.searchPrize) !== null) {
                        vm.prizesToShow.push(vm.allPrizes[el]);
                    }
                }
            }
        };
        vm.addPrizeSearch = function (prize) {
            var alreadExists = false;
            for (var el in vm.currentPrizes) {
                if (vm.currentPrizes[el].name == prize.name) {
                    alreadExists = true;
                }
            }
            if (!alreadExists) {
                prize.id = 'new association';
                vm.originalPersonPrizes.push(Object.assign({}, prize));
                vm.currentPrizes.push(Object.assign({}, prize));
            }
        };

        vm.initializeDatasets = function () {
            vm.sortType='year';
            vm.sortReverse=false;
            personData.datasetTypes()
                .then(function (response) {
                    vm.datasetTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            getDatasets();
        };
        function getDatasets(ind) {
            publications.getAllDatasets()
                .then(function (response) {
                    vm.allDatasets = response.data.result;
                    for (var el in vm.allDatasets) {
                        var p_id = [];
                        for (var el2 in vm.allDatasets[el].person_id) {
                            if (vm.allDatasets[el].person_id[el2] !== null) {
                                p_id.push(vm.allDatasets[el].person_id[el2]);
                            }
                        }
                        vm.allDatasets[el].person_id = p_id;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            publications.thisPersonDatasets(vm.currentUser.personID)
                .then(function (response) {
                    vm.originalPersonDatasets = response.data.result;
                    vm.originalPersonDatasets = vm.originalPersonDatasets.sort(sorter);
                    vm.currentDatasets = [];
                    for (var id in vm.originalPersonDatasets) {
                        vm.currentDatasets.push(Object.assign({}, vm.originalPersonDatasets[id]));
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
        vm.submitDatasets = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;

            var data = processDataRows(vm.currentDatasets,vm.originalPersonDatasets,
                                  'id', 'newDataset','updateDataset','deleteDataset');
            for (var el in data.updateDataset) {
                if (data.updateDataset[el].person_id.indexOf(vm.currentUser.personID) === -1) {
                    data.updateDataset[el].person_id.push(vm.currentUser.personID);
                }
            }
            for (var el in data.newDataset) {
                if (data.newDataset[el].person_id.indexOf(vm.currentUser.personID) === -1) {
                    data.newDataset[el].person_id.push(vm.currentUser.personID);
                }
            }
            publications.updateDatasetsPerson(vm.currentUser.personID,data)
                .then( function () {
                    getDatasets(ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.renderDatasets = function () {
            vm.datasetsToShow = [];
            if (vm.searchDataset.length >2) {
                for (var el in vm.allDatasets) {
                    if (nameMatching(vm.allDatasets[el].database_name,vm.searchDataset) !== null
                        || nameMatching(vm.allDatasets[el].short_description,vm.searchDataset) !== null) {
                        vm.datasetsToShow.push(vm.allDatasets[el]);
                    }
                }
            }
        };
        vm.addDatasetSearch = function (dataset) {
            var alreadExists = false;
            for (var el in vm.currentDatasets) {
                if (vm.currentDatasets[el].short_description == dataset.short_description
                    && vm.currentDatasets[el].database_name == dataset.database_name
                    && vm.currentDatasets[el].year == dataset.year) {
                    alreadExists = true;
                }
            }
            if (!alreadExists) {
                dataset.id = 'new association';
                vm.originalPersonDatasets.push(Object.assign({}, dataset));
                vm.currentDatasets.push(Object.assign({}, dataset));
            }
        };

        vm.initializeStartups = function () {
            vm.sortType='start';
            vm.sortReverse=true;
            getStartups();
        };
        function getStartups(ind) {
            publications.getAllStartups()
                .then(function (response) {
                    vm.allStartups = response.data.result;
                    for (var id in vm.allStartups) {
                        vm.allStartups[id]['start'] = processDate(vm.allStartups[id]['start']);
                        vm.allStartups[id]['end'] = processDate(vm.allStartups[id]['end']);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            publications.thisPersonStartups(vm.currentUser.personID)
                .then(function (response) {
                    vm.originalPersonStartups = response.data.result;
                    vm.originalPersonStartups = vm.originalPersonStartups.sort(sorter);
                    vm.currentStartups = [];
                    for (var id in vm.originalPersonStartups) {
                        vm.originalPersonStartups[id]['start'] = processDate(vm.originalPersonStartups[id]['start']);
                        vm.originalPersonStartups[id]['end'] = processDate(vm.originalPersonStartups[id]['end']);
                    }
                    for (var id in vm.originalPersonStartups) {
                        vm.currentStartups.push(Object.assign({}, vm.originalPersonStartups[id]));
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
        vm.submitStartups = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = processDataRows(vm.currentStartups,vm.originalPersonStartups,
                                  'id', 'newStartup','updateStartup','deleteStartup');
            publications.updateStartupsPerson(vm.currentUser.personID,data)
                .then( function () {
                    getStartups(ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.renderStartups = function () {
            vm.startupsToShow = [];
            if (vm.searchStartup.length >2) {
                for (var el in vm.allStartups) {
                    if (nameMatching(vm.allStartups[el].name,vm.searchStartup) !== null
                        || nameMatching(vm.allStartups[el].short_description,vm.searchStartup) !== null) {
                        vm.allStartups[el].year_start = momentToDate(vm.allStartups[el].start,undefined,'YYYY');
                        vm.allStartups[el].year_end = momentToDate(vm.allStartups[el].end,undefined,'YYYY');
                        vm.startupsToShow.push(vm.allStartups[el]);
                    }
                }
            }
        };
        vm.addStartupSearch = function (startup) {
            var alreadExists = false;
            for (var el in vm.currentStartups) {
                if (vm.currentStartups[el].short_description == startup.short_description
                    && vm.currentStartups[el].name == startup.name) {
                    alreadExists = true;
                }
            }
            if (!alreadExists) {
                startup.id = 'new association';
                vm.originalPersonStartups.push(Object.assign({}, startup));
                vm.currentStartups.push(Object.assign({}, startup));
            }
        };

        vm.initializeBoards = function () {
            vm.sortType='start_date';
            vm.sortReverse=true;
            personData.boardTypes()
                .then(function (response) {
                    vm.boardTypes = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            getBoards();
        };
        function getBoards(ind) {
            publications.thisPersonBoards(vm.currentUser.personID)
                .then(function (response) {
                    vm.originalPersonBoards = response.data.result;
                    vm.originalPersonBoards = vm.originalPersonBoards.sort(sorter);
                    vm.currentBoards = [];
                    for (var id in vm.originalPersonBoards) {
                        vm.originalPersonBoards[id]['start_date'] = processDate(vm.originalPersonBoards[id]['start_date']);
                        vm.originalPersonBoards[id]['end_date'] = processDate(vm.originalPersonBoards[id]['end_date']);
                        vm.currentBoards.push(Object.assign({}, vm.originalPersonBoards[id]));
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
        vm.submitBoards = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;

            var data = processDataRows(vm.currentBoards,vm.originalPersonBoards,
                                  'id', 'newBoard','updateBoard','deleteBoard');
            publications.updateBoardsPerson(vm.currentUser.personID,data)
                .then( function () {
                    getBoards(ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };

        vm.initializeOutreaches = function () {
            vm.sortType='event_date';
            vm.sortReverse=true;
            getOutreaches();
        };
        function getOutreaches(ind) {
            publications.thisPersonOutreaches(vm.currentUser.personID)
                .then(function (response) {
                    vm.originalPersonOutreaches = response.data.result;
                    vm.originalPersonOutreaches = vm.originalPersonOutreaches.sort(sorter);
                    vm.currentOutreaches = [];
                    for (var id in vm.originalPersonOutreaches) {
                        vm.originalPersonOutreaches[id]['event_date'] = processDate(vm.originalPersonOutreaches[id]['event_date']);
                        vm.currentOutreaches.push(Object.assign({}, vm.originalPersonOutreaches[id]));
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
        vm.submitOutreaches = function (ind) {
            vm.updateStatus[ind] = "Updating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;

            var data = processDataRows(vm.currentOutreaches,vm.originalPersonOutreaches,
                                  'id', 'newOutreach','updateOutreach','deleteOutreach');
            publications.updateOutreachesPerson(vm.currentUser.personID,data)
                .then( function () {
                    getOutreaches(ind);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };

        /* Initialization functions */
        function initializeVariables() {
            vm.deletePublications = [];
            vm.delAuthorNames = [];
            vm.newAuthorNames = [];
            vm.sortReverse = false;
            vm.sortType = 'year';
            vm.currentPage = 1;
            vm.pageSize = 10;

            // computes the number of pages
            vm.totalPublications = vm.personPublications.length;
            vm.totalPages = Math.ceil(vm.totalPublications / vm.pageSize);
            vm.pages = [];
            for (var num=1; num<=vm.totalPages; num++) {
                vm.pages.push(num);
            }
            vm.renderPublications();
        }
        function initializeVariablesCommunications() {
            vm.sortReverse = true;
            vm.sortType = 'date';
            vm.communicationDetailsORCID = [];
            vm.communicationDetails = {};
            vm.addCommunicationsORCID = [];

            vm.deleteCommunications = [];
            vm.currentPageCommunications = 1;
            vm.pageSizeCommunications = 10;

            // computes the number of pages
            vm.totalCommunications = vm.personCommunications.length;
            vm.totalPagesCommunications = Math.ceil(vm.totalCommunications / vm.pageSizeCommunications);
            vm.pagesCommunications = [];
            for (var num=1; num<=vm.totalPagesCommunications; num++) {
                vm.pagesCommunications.push(num);
            }
            vm.renderCommunications();
        }
        function initializeDetails() {
            vm.pubTitles = [];
            vm.thisPublication = [];
        }

        /* Auxiliary functions */
        function initializeImages() {
            vm.imagePersonPre = '';
            vm.imagePerson = '';
            vm.imagePersonCropped = '';
            $scope.$watch('vm.imagePersonPre["$ngfBlobUrl"]', function(newValue, oldValue, scope) {
                vm.imagePerson = newValue;
                vm.personImageType = vm.imagePersonPre.type;
            }, true);
        }
        function sorter(a,b) {
            if (vm.sortType == 'year') {
                if (vm.sortReverse) {
                    return (a[vm.sortType] ? String(a[vm.sortType]) : String(9999))
                        .localeCompare(b[vm.sortType] ? String(b[vm.sortType]) : String(9999));
                } else {
                    return -(a[vm.sortType] ? String(a[vm.sortType]) : String(1000))
                        .localeCompare(b[vm.sortType] ? String(b[vm.sortType]) : String(1000));
                }
            } else if (vm.sortType == 'date'
                        || vm.sortType == 'status_date'
                        || vm.sortType == 'start'
                        || vm.sortType == 'start_date'
                        || vm.sortType == 'event_date') {
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
            } else {
                if (vm.sortReverse) {
                    return -(a[vm.sortType] ? a[vm.sortType] : '')
                        .localeCompare(b[vm.sortType] ? b[vm.sortType] : '');
                } else {
                    return (a[vm.sortType] ? a[vm.sortType] : '')
                        .localeCompare(b[vm.sortType] ? b[vm.sortType] : '');
                }
            }
        }
        function timeOverlap(d1_start,d1_end, d2_start, d2_end) {
            // returns false if no overlap
            // else returns [startoverlap,endoverlap]
            // null in start time is assumed to be -Inf
            // null in end time is assumed to be +Inf
            var startOverlap;
            var endOverlap;
            if (d1_start !== null) {
                if (d1_end !== null) {
                    if (d2_start !== null) {
                        if (d2_end !== null) {
                            if (moment(d1_start).isSameOrAfter(moment(d2_end))
                                || moment(d1_end).isSameOrBefore(moment(d2_start))) {
                                return false;
                            } else {
                                // there's overlap
                                if (moment(d1_start).isAfter(moment(d2_start))) {
                                    startOverlap = d1_start;
                                } else {
                                    startOverlap = d2_start;
                                }
                                if (moment(d1_end).isBefore(moment(d2_end))) {
                                    endOverlap = d1_end;
                                } else {
                                    endOverlap = d2_end;
                                }
                                return [startOverlap,endOverlap];
                            }
                        } else {
                            if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                                return false;
                            } else {
                                // there's overlap
                                if (moment(d1_start).isAfter(moment(d2_start))) {
                                    startOverlap = d1_start;
                                } else {
                                    startOverlap = d2_start;
                                }
                                endOverlap = d1_end;
                                return [startOverlap,endOverlap];
                            }
                        }
                    } else {
                        // d2_start is null
                        if (d2_end !== null) {
                            if (moment(d1_start).isSameOrAfter(moment(d2_end))) {
                                return false;
                            } else {
                                // there's overlap
                                startOverlap = d1_start;
                                endOverlap = d1_end;
                                if (moment(d1_end).isBefore(moment(d2_end))) {

                                } else {
                                    endOverlap = d2_end;
                                }
                                return [startOverlap,endOverlap];
                            }
                        } else {
                            // there's overlap
                            startOverlap = d1_start;
                            endOverlap = d1_end;
                            return [startOverlap,endOverlap];
                        }
                    }
                } else {
                    // d1_end is null
                    if (d2_start !== null) {
                        if (d2_end !== null) {
                            if (moment(d1_start).isSameOrAfter(moment(d2_end))) {
                                return false;
                            } else {
                                // there's overlap
                                if (moment(d1_start).isAfter(moment(d2_start))) {
                                    startOverlap = d1_start;
                                } else {
                                    startOverlap = d2_start;
                                }
                                if (moment(d1_end).isBefore(moment(d2_end))) {
                                    endOverlap = d1_end;
                                } else {
                                    endOverlap = d2_end;
                                }
                                return [startOverlap,endOverlap];
                            }
                        } else {
                            if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                                return false;
                            } else {
                                // there's overlap
                                if (moment(d1_start).isAfter(moment(d2_start))) {
                                    startOverlap = d1_start;
                                } else {
                                    startOverlap = d2_start;
                                }
                                endOverlap = d1_end;
                                return [startOverlap,endOverlap];
                            }
                        }
                    } else {
                        // d2_start is null
                        if (d2_end !== null) {
                            if (moment(d1_start).isSameOrAfter(moment(d2_end))) {
                                return false;
                            } else {
                                // there's overlap
                                startOverlap = d1_start;
                                if (moment(d1_end).isBefore(moment(d2_end))) {
                                    endOverlap = d1_end;
                                } else {
                                    endOverlap = d2_end;
                                }
                                return [startOverlap,endOverlap];
                            }
                        } else {
                            // there's overlap
                            startOverlap = d1_start;
                            endOverlap = d1_end;
                            return [startOverlap,endOverlap];
                        }
                    }
                }
            } else {
                // d1_start is null
                if (d1_end !== null) {
                    if (d2_start !== null) {
                        if (d2_end !== null) {
                            if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                                return false;
                            } else {
                                // there's overlap
                                startOverlap = d2_start;
                                if (moment(d1_end).isBefore(moment(d2_end))) {
                                    endOverlap = d1_end;
                                } else {
                                    endOverlap = d2_end;
                                }
                                return [startOverlap,endOverlap];
                            }
                        } else {
                            if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                                return false;
                            } else {
                                // there's overlap
                                startOverlap = d2_start;
                                endOverlap = d1_end;
                                return [startOverlap,endOverlap];
                            }
                        }
                    } else {
                        // d2_start is null
                        if (d2_end !== null) {
                            // there's overlap
                            startOverlap = d1_start; // yes it's null
                            if (moment(d1_end).isBefore(moment(d2_end))) {
                                endOverlap = d1_end;
                            } else {
                                endOverlap = d2_end;
                            }
                            return [startOverlap,endOverlap];
                        } else {
                            // there's overlap
                            startOverlap = d1_start;
                            endOverlap = d1_end;
                            return [startOverlap,endOverlap];
                        }
                    }
                } else {
                    // d1_end is null
                    startOverlap = d2_start; //even if it is null
                    endOverlap = d2_end; //even if it is null
                    return [startOverlap,endOverlap];
                }
            }
        }
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
                    if (vm.thisPerson.pers_photo[0].personal_photo_id !== null) {
                        vm.hasPhoto = true;
                    }
                    if (vm.thisPerson['birth_date'] !== null) {
                        var birthDate = new Date(vm.thisPerson['birth_date']);
                        vm.thisPerson['birth_date'] = birthDate;
                    }
                    vm.selectedNationalities = [];
                    for (var nat in vm.thisPerson.nationalities) {
                        vm.selectedNationalities.push(Object.assign({}, vm.thisPerson.nationalities[nat]));
                    }
                    vm.currentCars = [];
                    for (var id in vm.thisPerson.cars) {
                        vm.currentCars.push(Object.assign({}, vm.thisPerson.cars[id]));
                    }
                    vm.currentIDs = [];
                    for (var id in vm.thisPerson.identifications) {
                        if (vm.thisPerson.identifications[id]['card_valid_until'] !== null) {
                            date = new Date(vm.thisPerson.identifications[id]['card_valid_until']);
                            vm.thisPerson.identifications[id]['card_valid_until'] = date;
                        }
                        vm.currentIDs.push(Object.assign({}, vm.thisPerson.identifications[id]));
                    }
                    var authors = [];
                    for (var el in vm.thisPerson.author_data) {
                        if (vm.thisPerson.author_data[el].author_name_id !== null) {
                            authors.push(vm.thisPerson.author_data[el]);
                        }
                    }
                    vm.thisPerson.author_data = authors;
                    vm.currentEmergencyContacts = [];
                    for (var id in vm.thisPerson.emergency_contacts) {
                        vm.currentEmergencyContacts.push(Object.assign({}, vm.thisPerson.emergency_contacts[id]));
                    }
                    vm.currentURLs = [];
                    for (var id in vm.thisPerson.pers_url) {
                        vm.currentURLs.push(Object.assign({}, vm.thisPerson.pers_url[id]));
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

                    vm.currentResearchInterests = [];
                    vm.thisPerson.research_interests.sort(function(a,b) {return a.sort_order-b.sort_order;});
                    for (var id in vm.thisPerson.research_interests) {
                        vm.currentResearchInterests.push(Object.assign({}, vm.thisPerson.research_interests[id]));
                    }

                    vm.currentAffiliationsLab = [];
                    for (var id in vm.thisPerson.lab_data) {
                        vm.thisPerson.lab_data[id]['lab_start'] = processDate(vm.thisPerson.lab_data[id]['lab_start']);
                        vm.thisPerson.lab_data[id]['lab_end'] = processDate(vm.thisPerson.lab_data[id]['lab_end']);
                        vm.thisPerson.lab_data[id]['labs_groups_valid_from'] = processDate(vm.thisPerson.lab_data[id]['labs_groups_valid_from']);
                        vm.thisPerson.lab_data[id]['labs_groups_valid_until'] = processDate(vm.thisPerson.lab_data[id]['labs_groups_valid_until']);
                        vm.thisPerson.lab_data[id]['lab_opened'] = processDate(vm.thisPerson.lab_data[id]['lab_opened']);
                        vm.thisPerson.lab_data[id]['lab_closed'] = processDate(vm.thisPerson.lab_data[id]['lab_closed']);
                        vm.currentAffiliationsLab.push(Object.assign({}, vm.thisPerson.lab_data[id]));
                    }


                    vm.currentCostCenters = [];
                    for (var id in vm.thisPerson.cost_centers) {
                        vm.thisPerson.cost_centers[id]['valid_from'] = processDate(vm.thisPerson.cost_centers[id]['valid_from']);
                        vm.thisPerson.cost_centers[id]['valid_until'] = processDate(vm.thisPerson.cost_centers[id]['valid_until']);
                        vm.currentCostCenters.push(Object.assign({}, vm.thisPerson.cost_centers[id]));
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
        function getDataLists(){
            personData.allCountries()
                .then(function (response) {
                    vm.countries = response.data.result;
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
            personData.urlTypes()
                .then(function (response) {
                    vm.urlTypes = response.data.result;
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
        function processSelectedPub(current, original) {
            var add = [];
            var del = [];
            var addPublic = [];
            var delPublic = [];
            for (var curr in current) {
                for (var ori in original) {
                    if (current[curr].people_publications_id === original[ori].people_publications_id) {
                        if (current[curr].selected === true && original[ori].selected === false) {
                            add.push(current[curr]);
                        } else if (current[curr].selected === false && original[ori].selected === true) {
                            del.push(current[curr]);
                        }
                        if (current[curr].public === true && original[ori].public === false) {
                            addPublic.push(current[curr]);
                        } else if (current[curr].public === false && original[ori].public === true) {
                            delPublic.push(current[curr]);
                        }
                        break;
                    }
                }
            }
            var objReturn = {};
            objReturn['addSelectedPub'] = add;
            objReturn['delSelectedPub'] = del;
            objReturn['addPublicPub'] = addPublic;
            objReturn['delPublicPub'] = delPublic;
            return objReturn;
        }
        function convertData(arrObj) {
            // selects data for exporting
            var data = [];
            if (arrObj.length > 0) {
                for (var el in arrObj) {
                    for (var ind in arrObj[el].publication_type) {
                        if (ind > 0) {
                            arrObj[el]['doc_type'] = arrObj[el]['doc_type'] + '; ' + arrObj[el].publication_type[ind].name_en;
                        } else {
                            arrObj[el]['doc_type'] = arrObj[el].publication_type[ind].name_en;
                        }
                    }
                    var if_last_year = {impact_factor: 0};
                    for (var ind in arrObj[el].impact_factors) {
                        if (ind > 0) {
                            if (if_last_year.year < arrObj[el].impact_factors[ind].year) {
                                if_last_year = arrObj[el].impact_factors[ind];
                            }
                        } else {
                            if_last_year = arrObj[el].impact_factors[ind];
                        }
                    }
                    var citations_last_year = {citations: 0};
                    for (var ind in arrObj[el].citations) {
                        if (ind > 0) {
                            if (citations_last_year.year < arrObj[el].citations[ind].year) {
                                citations_last_year = arrObj[el].citations[ind];
                            }
                        } else {
                            citations_last_year = arrObj[el].citations[ind];
                        }
                    }
                    data.push({
                        "Authors": arrObj[el]['authors_raw'],
                        "Title": arrObj[el]['title'],
                        "Year": arrObj[el]['year'],
                        "Publication Date": arrObj[el]['publication_date'],
                        "Journal Name": arrObj[el]['journal_name'],
                        "Journal Short Name": arrObj[el]['journal_short_name'],
                        "Publisher": arrObj[el]['publisher'],
                        "Publisher City": arrObj[el]['publisher_city'],
                        "ISSN": arrObj[el]['issn'],
                        "EISSN": arrObj[el]['eissn'],
                        "Volume": arrObj[el]['volume'],
                        "Page Start": arrObj[el]['page_start'],
                        "Page End": arrObj[el]['page_end'],
                        "DOI": arrObj[el]['doi'],
                        "WOS": arrObj[el]['wos'],
                        "PubMed ID": arrObj[el]['pubmed_id'],
                        "DOI": arrObj[el]['doi'],
                        "Citations": citations_last_year.citations,
                        "Impact Factors": if_last_year.impact_factor
                    });
                }
                return data;
            }
            return data;
        }
        function convertDataCommunications(arrObj) {
            // selects data for exporting
            var data = [];
            if (arrObj.length > 0) {
                for (var el in arrObj) {
                    data.push({
                        "Conference type": arrObj[el]['conference_type_name'],
                        "International": arrObj[el]['international'],
                        "Communication type": arrObj[el]['communication_type_name'],
                        "Authors": arrObj[el]['authors_raw'],
                        "Presenter": arrObj[el]['presenter'],
                        "Title": arrObj[el]['title'],
                        "Conf. Title": arrObj[el]['conference_title'],
                        "Year": momentToDate(arrObj[el]['date'],undefined,'YYYY'),
                        "Comm. Date": momentToDate(arrObj[el]['date']),
                        "City": arrObj[el]['city'],
                        "Country": arrObj[el]['country_name'],
                        "DOI": arrObj[el]['doi']
                    });
                }
                return data;
            }
            return data;
        }
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
        function momentToDate(timedate, timezone, timeformat) {
        if (timezone === undefined) {
            timezone = 'Europe/Lisbon';
        }
        if (timeformat === undefined) {
            timeformat = 'YYYY-MM-DD';
        }
        return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
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
    var commDetailsCtrl = function($mdDialog) {
        var ctrl = this;
        ctrl.communicationAuthorsList = function (str, num) {
            var authors = str.split(';');
            ctrl.presenters = [];
            for (var ind in authors) {
                ctrl.presenters.push(authors[ind].trim());
            }
        };
        ctrl.changedField = function (field,work) {
            // only need to do this for fields that are shown
            if (field === 'communicationTypes') {
                for (var ind in ctrl.vm.communicationTypes) {
                    if (ctrl.vm.communicationTypes[ind].id == work.communication_type_id) {
                        work.communication_type_name = ctrl.vm.communicationTypes[ind].name;
                    }
                }
            }
            if (field === 'countries') {
                for (var ind in ctrl.vm.countries) {
                    if (ctrl.vm.countries[ind].country_id == work.country_id) {
                        work.country_name = ctrl.vm.countries[ind].name;
                    }
                }
            }
        };
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
    var personCars = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/personal/person.carsInfo.html'
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
    var personUrls = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/personal/person.personalURLs.html'
        };
    };
    var personResearchInterests = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/researcher/person.researchInterests.html'
        };
    };
    var personResearcherInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/researcher/person.researcherInfo.html'
        };
    };
    var personCostCenter = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/researcher/person.costCenter.html'
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
    var personAuthorNames = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/researcher/person.authorNames.html'
        };
    };
    var personPublications = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/publications/person.publications.html'
        };
    };
    var personPublicationDetail = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/publications/person.publicationDetail.html'
        };
    };
    var personAddPublications = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/publications/person.addPublications.html'
        };
    };
    var personAddPublicationsOrcid = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/publications/person.addPublicationsORCID.html'
        };
    };
    var personCommunications = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/communications/person.communications.html'
        };
    };
    var personAddCommunicationsOrcid = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/communications/person.addCommunicationsORCID.html'
        };
    };
    var personAddCommunications = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/communications/person.addCommunications.html'
        };
    };

    var personBoards = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/boards/person.boards.html'
        };
    };
    var personDatasets = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/datasets/person.datasets.html'
        };
    };
    var personOutreach = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/outreach/person.outreach.html'
        };
    };
    var personPatents = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/patents/person.patents.html'
        };
    };
    var personPrizes = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/prizes/person.prizes.html'
        };
    };
    var personStartups = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/productivity/startups/person.startups.html'
        };
    };

    var personWebsitePhoto = function () {
        return {
            restrict: 'E',
            templateUrl: 'person/personal/person.websitePhoto.html'
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
    var integerValidate = function () {
        return {
            require: 'ngModel',
            link: function (scope, elm, attrs, ctrl) {
                var filterInt = function(value) {
                    if (/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
                        return Number(value);
                    }
                    return NaN;
                };
                ctrl.$validators.integerValidate = function(modelValue, viewValue) {
                    if (viewValue == null) {
                        ctrl.$setValidity('integer', true);
                        return true;
                    } else {
                        if (isNaN(filterInt(viewValue))) {
                            ctrl.$setValidity('integer', false);
                            return false;
                        } else if (filterInt(viewValue)<=0) {
                            ctrl.$setValidity('integer', false);
                            return false;
                        } else {
                            ctrl.$setValidity('integer', true);
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
        .directive('personCars', personCars)
        .directive('personEmergencyContacts', personEmergencyContacts)
        .directive('personFinishedDegrees', personFinishedDegrees)
        .directive('personIdentificationsInfo', personIdentificationsInfo)
        .directive('personNuclearInfo', personNuclearInfo)
        .directive('personUrls', personUrls)
        .directive('personResearchInterests', personResearchInterests)
        .directive('personResearcherInfo', personResearcherInfo)
        .directive('personCostCenter', personCostCenter)
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
        .directive('personAuthorNames', personAuthorNames)
        .directive('personPublications', personPublications)
        .directive('personAddPublications', personAddPublications)
        .directive('personCommunications', personCommunications)
        .directive('personAddCommunications', personAddCommunications)
        .directive('personAddCommunicationsOrcid', personAddCommunicationsOrcid)
        .directive('personAddPublicationsOrcid', personAddPublicationsOrcid)
        .directive('personPublicationDetail', personPublicationDetail)
        .directive('personWebsitePhoto', personWebsitePhoto)
        .directive('personBoards', personBoards)
        .directive('personDatasets', personDatasets)
        .directive('personOutreach', personOutreach)
        .directive('personPatents', personPatents)
        .directive('personPrizes', personPrizes)
        .directive('personStartups', personStartups)


        .directive('postalCodeValidate', postalCodeValidate)
        .directive('dedicationValidate', dedicationValidate)
        .directive('integerValidate', integerValidate)

        .controller('personCtrl',  personCtrl)
        .controller('commDetailsCtrl',  commDetailsCtrl)
        .controller('CountrySelectCtrl', CountrySelectCtrl)
        .controller('LabSelectCtrl', LabSelectCtrl)
        .controller('PeopleSelectCtrl', PeopleSelectCtrl)
        ;
})();

