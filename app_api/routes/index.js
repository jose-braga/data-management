var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

var auth = jwt({
    secret: process.env.JWT_SECRET,
    requestProperty: 'payload'
});


var ctrlPeopleData = require('../controllers/people.js');
var ctrlTeamData = require('../controllers/team.js');
var ctrlManagerData = require('../controllers/manager.js');
var ctrlProductivityData = require('../controllers/productivity.js');
var ctrlStatistics = require('../controllers/statistics.js');
var ctrlDocsData = require('../controllers/docs.js');

var ctrlOrders = require('../controllers/internal-orders.js');

var ctrlRegistrationData = require('../controllers/registration.js');
var ctrlPreRegistrationData = require('../controllers/pre-registration.js');
var ctrlAuth = require('../controllers/authentication.js');

/************************* PUBLIC API ENDPOINTS for v1 ************************/
// GET for person
router.get('/v1/person', ctrlPeopleData.searchPeople);
router.get('/v1/person/all', ctrlPeopleData.getAllPeople);
router.get('/v1/person/:personID', ctrlPeopleData.getPersonInfo);
router.get('/v1/group/:groupID', ctrlPeopleData.getGroupInfo);
router.get('/v1/lab/:labID', ctrlPeopleData.getLabInfo);
router.get('/v1/group/:groupID/lab/:labID/members', ctrlPeopleData.getLabMembers);
router.get('/v1/facility/:facilityID/members', ctrlPeopleData.getFacilityMembers);
router.get('/v1/science-management/:officeID/members', ctrlPeopleData.getScienceOfficeMembers);
router.get('/v1/administrative/:officeID/members', ctrlPeopleData.getAdministrativeOfficeMembers);
// GET lists for several purposes
router.get('/v1/list/:listOf', ctrlPeopleData.listOf);
// GET search for publications
router.get('/v1/publication/all', ctrlProductivityData.getAllPublications);
router.get('/v1/publication/:pubID', ctrlProductivityData.getPublicationInfo);
router.get('/v1/publication/person/:personID', ctrlProductivityData.getPersonPublicationInfo);
router.get('/v1/publication/group/:groupID/lab/:labID', ctrlProductivityData.getLabPublicationInfo);
router.get('/v1/publication/group/:groupID', ctrlProductivityData.getGroupPublicationInfo);
router.get('/v1/publication/unit/:unitID', ctrlProductivityData.getUnitPublicationInfo);
router.get('/v1/publication/unit/:unitID/latest', ctrlProductivityData.getLatestPublications);


/**************************** APP SPECIFIC ENDPOINTS ****************************/

// GET lists of non-confidential information about people
router.get('/people', ctrlPeopleData.listActivePeople);
router.get('/people/all', ctrlPeopleData.listAllPeople); //should come before GET /people/:personID
router.get('/people/all-for-team', ctrlTeamData.listAllPeople); //gets data for team leader or team manager


// GET specific data of a person
router.get('/people/:personID', auth, ctrlPeopleData.listPersonData);
// Unauthenticated lists if data
router.get('/list/:listOf', ctrlPeopleData.listOf);

// TODO: DELETE all data of a person
//router.delete('/people/:username', auth, ctrlPeopleData.deletePersonErrorData);


// PUT (Update) USER information (authenticated)
router.put('/people/authorization-info/:personID', auth, ctrlPeopleData.updateAuthorizationInfoPerson);
router.put('/people/nuclear-info/:personID', auth, ctrlPeopleData.updateNuclearInfoPerson);
router.put('/people/contact-info/:personID', auth, ctrlPeopleData.updateContactInfoPerson);
router.put('/people/identifications/:personID', auth, ctrlPeopleData.updateIdentificationsInfoPerson);
router.put('/people/cars/:personID', auth, ctrlPeopleData.updateCarsPerson);
router.put('/people/institutional-contacts/:personID', auth, ctrlPeopleData.updateInstitutionalContactsPerson);
router.put('/people/emergency-contacts/:personID', auth, ctrlPeopleData.updateEmergencyContactsPerson);
router.put('/people/finished-degrees/:personID', auth, ctrlPeopleData.updateFinishedDegreesPerson);
router.put('/people/ongoing-degrees/:personID', auth, ctrlPeopleData.updateOngoingDegreesPerson);
router.put('/people/jobs/:personID', auth, ctrlPeopleData.updateJobsPerson);
router.put('/people/short-cv/:personID', auth, ctrlPeopleData.updateShortCVPerson);
router.put('/people/personal-urls/:personID', auth, ctrlPeopleData.updateURLsPerson);
router.put('/people/research-interests/:personID', auth, ctrlPeopleData.updateResearchInterestsPerson);
router.put('/people/lab-affiliations/:personID', auth, ctrlPeopleData.updateAffiliationsLabPerson);
router.put('/people/technician-affiliations/:personID', auth, ctrlPeopleData.updateTechnicianAffiliationsPerson);
router.put('/people/science-manager-affiliations/:personID', auth, ctrlPeopleData.updateScienceManagerAffiliationsPerson);
router.put('/people/administrative-affiliations/:personID', auth, ctrlPeopleData.updateAdministrativeAffiliationsPerson);
router.put('/people/department-affiliations/:personID', auth, ctrlPeopleData.updateAffiliationsDepartmentPerson);
router.put('/people/cost-centers/:personID', auth, ctrlPeopleData.updateCostCentersPerson);
router.put('/people/researcher-info/:personID', auth, ctrlPeopleData.updateResearcherInfoPerson);
router.put('/people/technician-info/:personID', auth, ctrlPeopleData.updateTechnicianInfoPerson);
router.put('/people/science-manager-info/:personID', auth, ctrlPeopleData.updateScienceManagerInfoPerson);
router.put('/people/administrative-info/:personID', auth, ctrlPeopleData.updateAdministrativeInfoPerson);
router.put('/people/left/:personID', auth, ctrlPeopleData.updatePersonLeft);
router.put('/people/responsibles/:personID', auth, ctrlPeopleData.updateResponsiblesPerson);
router.put('/people/institution-city/:personID', auth, ctrlPeopleData.updateInstitutionCityPerson);

router.post('/people/photo/:personID/:imageType', auth, ctrlPeopleData.updatePhoto);

// DELETE request
router.delete('/people/role/:role/:personID', auth, ctrlPeopleData.deleteRolePerson);

// GET TEAM information (authenticated)
// TODO: listLabData is a dummy function right now
router.get('/username/:username/check', auth, ctrlTeamData.checkUsername);

router.get('/labs/:teamID', auth, ctrlTeamData.listLabData);


router.get('/labs/:groupID/:teamID/people', auth, ctrlTeamData.listLabPeopleData);
router.get('/facilities/:unitID/:teamID/people', auth, ctrlTeamData.listTechPeopleData);
router.get('/science-management-offices/:unitID/:teamID/people', auth, ctrlTeamData.listScManPeopleData);
router.get('/administrative-offices/:unitID/:teamID/people', auth, ctrlTeamData.listAdmPeopleData);

// PUT (Update) TEAM information (authenticated)
router.put('/team/people-lab/:groupID/:teamID', auth, ctrlTeamData.updateLabPeople);
router.put('/team/people-technician/:unitID/:teamID', auth, ctrlTeamData.updateTechPeople);
router.put('/team/people-science-manager/:unitID/:teamID', auth, ctrlTeamData.updateScManPeople);
router.put('/team/people-administrative/:unitID/:teamID', auth, ctrlTeamData.updateAdmPeople);
router.post('/team/pre-register', auth, ctrlTeamData.preRegister);

// GET MANAGER information (authenticated)
router.get('/manager/people/all-with-roles', auth, ctrlManagerData.listAllPeopleWithRolesData);
router.get('/manager/people/all-no-roles', auth, ctrlManagerData.listAllPeopleNoRolesData);
router.get('/manager/people/validate', auth, ctrlManagerData.listPeopleValidate);
// PUT (updated) MANAGER information (authenticated)
router.put('/manager/people/validate/:personID', auth, ctrlManagerData.validatePerson);
router.put('/manager/people/password-reset/:personID', auth, ctrlManagerData.passwordReset);
router.put('/manager/people/fct-mctes-status/:personID', auth, ctrlManagerData.sendAdditionEmail);
router.put('/manager/people/fct-mctes-status/:personID/remove', auth, ctrlManagerData.sendRemovalEmail);
router.put('/manager/people/fct-mctes-status/:personID/update', auth, ctrlManagerData.updateStatusFCT);
router.put('/manager/people/user-permissions/:personID', auth, ctrlManagerData.updateUserPermissions);
router.put('/manager/people/all', auth, ctrlManagerData.updateAllPeopleData);

// PRODUCTIVITY information (authenticated)
router.get('/publications/all', auth, ctrlProductivityData.listAllPublications);
router.get('/publications/person/:personID', auth, ctrlProductivityData.listPersonPublications);
router.get('/publications/person/pure/:pureID', auth, ctrlProductivityData.listPersonPUREPublications);
router.put('/publications/person/:personID/add-pure', auth, ctrlProductivityData.addPUREPublicationsPerson);
router.get('/publications/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersPublications);
router.get('/publications/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamPublications);
router.put('/publications/person/:personID/selected', auth, ctrlProductivityData.updatePersonSelectedPub);
router.put('/publications/person/:personID/author-names', auth, ctrlProductivityData.updatePersonAuthorNames);
router.put('/publications/person/:personID/delete', auth, ctrlProductivityData.deletePublicationsPerson);
router.put('/publications/person/:personID/add', auth, ctrlProductivityData.addPublicationsPerson);
router.put('/publications/person/:personID/add-orcid', auth, ctrlProductivityData.addORCIDPublicationsPerson);
router.put('/publications/team/:groupID/:teamID', auth, ctrlProductivityData.addPublicationsLab);
router.put('/publications/team/:groupID/:teamID/selected', auth, ctrlProductivityData.updateTeamSelectedPub);
router.put('/publications/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deletePublicationsTeam);
router.put('/publications/publication/:pubID', auth, ctrlProductivityData.updatePublicationData);

router.get('/communications/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersCommunications);
router.get('/communications/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamCommunications);
router.get('/communications/person/:personID', auth, ctrlProductivityData.listPersonCommunications);
router.put('/communications/person/:personID/delete', auth, ctrlProductivityData.deleteCommunicationsPerson);
router.put('/communications/team/:groupID/:teamID', auth, ctrlProductivityData.addCommunicationsLab);
router.put('/communications/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteCommunicationsTeam);
router.put('/communications/person/:personID', auth, ctrlProductivityData.updatePersonCommunications);
router.put('/communications/person/:personID/add-orcid', auth, ctrlProductivityData.addORCIDCommunicationsPerson);
router.put('/communications/person/:personID/add', auth, ctrlProductivityData.addORCIDCommunicationsPerson); // both use the same function
router.put('/communications/communication/:workID', auth, ctrlProductivityData.updateCommunicationData);
router.put('/communications/person/:personID/selected', auth, ctrlProductivityData.updatePersonSelectedComm);

router.get('/patents/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersPatents);
router.get('/patents/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamPatents);
router.get('/patents/all', auth, ctrlProductivityData.listPatents);
router.get('/patents/person/:personID', auth, ctrlProductivityData.listPersonPatents);
router.put('/patents/team/:groupID/:teamID', auth, ctrlProductivityData.addPatentsLab);
router.put('/patents/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deletePatentsTeam);
router.put('/patents/person/:personID', auth, ctrlProductivityData.updatePersonPatents);

router.get('/prizes/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersPrizes);
router.get('/prizes/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamPrizes);
router.get('/prizes/all', auth, ctrlProductivityData.listPrizes);
router.get('/prizes/person/:personID', auth, ctrlProductivityData.listPersonPrizes);
router.put('/prizes/team/:groupID/:teamID', auth, ctrlProductivityData.addPrizesLab);
router.put('/prizes/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deletePrizesTeam);
router.put('/prizes/person/:personID', auth, ctrlProductivityData.updatePersonPrizes);

router.get('/datasets/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersDatasets);
router.get('/datasets/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamDatasets);
router.get('/datasets/all', auth, ctrlProductivityData.listDatasets);
router.get('/datasets/person/:personID', auth, ctrlProductivityData.listPersonDatasets);
router.put('/datasets/team/:groupID/:teamID', auth, ctrlProductivityData.addDatasetsLab);
router.put('/datasets/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteDatasetsTeam);
router.put('/datasets/person/:personID', auth, ctrlProductivityData.updatePersonDatasets);

router.get('/startups/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersStartups);
router.get('/startups/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamStartups);
router.get('/startups/all', auth, ctrlProductivityData.listStartups);
router.get('/startups/person/:personID', auth, ctrlProductivityData.listPersonStartups);
router.put('/startups/team/:groupID/:teamID', auth, ctrlProductivityData.addStartupsLab);
router.put('/startups/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteStartupsTeam);
router.put('/startups/person/:personID', auth, ctrlProductivityData.updatePersonStartups);

router.get('/boards/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersBoards);
router.get('/boards/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamBoards);
router.get('/boards/person/:personID', auth, ctrlProductivityData.listPersonBoards);
router.put('/boards/team/:groupID/:teamID', auth, ctrlProductivityData.addBoardsLab);
router.put('/boards/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteBoardsTeam);
router.put('/boards/person/:personID', auth, ctrlProductivityData.updatePersonBoards);

router.get('/outreaches/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersOutreaches);
router.get('/outreaches/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamOutreaches);
router.get('/outreaches/person/:personID', auth, ctrlProductivityData.listPersonOutreaches);
router.put('/outreaches/team/:groupID/:teamID', auth, ctrlProductivityData.addOutreachesLab);
router.put('/outreaches/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteOutreachesTeam);
router.put('/outreaches/person/:personID', auth, ctrlProductivityData.updatePersonOutreaches);

router.get('/projects/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersProjects);
router.get('/projects/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamProjects);
router.get('/projects/all', auth, ctrlProductivityData.listProjects);
router.get('/projects/person/:personID', auth, ctrlProductivityData.listPersonProjects);
router.put('/projects/team/:groupID/:teamID', auth, ctrlProductivityData.addProjectsLab);
router.put('/projects/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteProjectsTeam);
router.put('/projects/person/:personID', auth, ctrlProductivityData.updatePersonProjects);

router.get('/agreements/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersAgreements);
router.get('/agreements/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamAgreements);
router.get('/agreements/all', auth, ctrlProductivityData.listAgreements);
router.get('/agreements/person/:personID', auth, ctrlProductivityData.listPersonAgreements);
router.put('/agreements/team/:groupID/:teamID', auth, ctrlProductivityData.addAgreementsLab);
router.put('/agreements/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteAgreementsTeam);
router.put('/agreements/person/:personID', auth, ctrlProductivityData.updatePersonAgreements);

router.get('/trainings/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersTrainings);
router.get('/trainings/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamTrainings);
router.get('/trainings/all', auth, ctrlProductivityData.listTrainings);
router.get('/trainings/person/:personID', auth, ctrlProductivityData.listPersonTrainings);
router.put('/trainings/team/:groupID/:teamID', auth, ctrlProductivityData.addTrainingsLab);
router.put('/trainings/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteTrainingsTeam);
router.put('/trainings/person/:personID', auth, ctrlProductivityData.updatePersonTrainings);

// POST (Create) new user (authenticated)
router.get('/docs/unit/:unitID/active', auth, ctrlDocsData.getUnitActiveDocs);
router.get('/docs/unit/:unitID', auth, ctrlDocsData.getUnitDocs);
router.post('/docs/unit/:unitID', auth, ctrlDocsData.addDoc);
router.put('/docs/unit/:unitID/:docID', auth, ctrlDocsData.updateDoc);
router.delete('/docs/unit/:unitID/:docID', auth, ctrlDocsData.deleteDoc);

// POST (Create) new user (authenticated)
router.post('/registration', auth, ctrlRegistrationData.addPerson);

// API endpoint for autentication to pre-registration
router.post('/pre-registration', ctrlAuth.preRegistration);

// POST new user data on pre.registration
router.post('/pre-registration/data', auth, ctrlPreRegistrationData.preRegisterPerson);
router.post('/pre-registration/photo/:personID/:imageType', auth, ctrlPreRegistrationData.updatePhoto);
router.get('/pre-registration/people/:personID', auth, ctrlPreRegistrationData.getPersonData);

/* Internal orders API */
router.get('/users/:userID/orders/:accountID', auth, ctrlOrders.getUserOrders);
router.post('/users/:userID/orders/:accountID', auth, ctrlOrders.makeOrder);
router.get('/users/:userID/multiple-accounts', auth, ctrlOrders.getUserMultipleAccounts);
router.get('/users/:userID/accounts-orders/:accountID', auth, ctrlOrders.getUserAccounts);
router.get('/users/:userID/inventory/:accountID', auth, ctrlOrders.getInventory);
router.get('/users/:userID/management-permissions', auth, ctrlOrders.getManagementPermissions);
router.get('/stock-managers/:userID/users-info', auth, ctrlOrders.getManagementUsersInfo);
router.put('/stock-managers/:userID/users-info', auth, ctrlOrders.updateManagementUsersInfo);
router.get('/stock-managers/:userID/users-search', auth, ctrlOrders.searchPeopleSimple);
router.get('/stock-managers/:userID/inventory', auth, ctrlOrders.getManagementInventory);
router.put('/stock-managers/:userID/inventory', auth, ctrlOrders.updateManagementInventory);
router.get('/stock-managers/:userID/orders', auth, ctrlOrders.getManagementOrders);
router.put('/stock-managers/:userID/orders/:orderID', auth, ctrlOrders.updateManagementOrder);
router.put('/stock-managers/:userID/orders/:orderID/approve', auth, ctrlOrders.approveManagementOrder);
router.put('/stock-managers/:userID/orders/:orderID/reject', auth, ctrlOrders.rejectManagementOrder);
router.put('/stock-managers/:userID/orders/:orderID/deliver-part', auth, ctrlOrders.partialDeliveryManagementOrder);
router.put('/stock-managers/:userID/orders/:orderID/close', auth, ctrlOrders.closeManagementOrder);
router.put('/financial-managers/:userID/financial-structure', auth, ctrlOrders.updateManagementFinancialStructure);
router.get('/financial-managers/:userID/account-info/:accountID', auth, ctrlOrders.getManagementAccountFinances);
router.put('/financial-managers/:userID/account-info/:accountID', auth, ctrlOrders.updateManagementAccountFinances);




// API points for authentication
//router.post('/register', ctrlAuth.register); // registration will be done afterwards
router.post('/login', ctrlAuth.login);
//only authenticated requests can change password
router.put('/change-password/:userID', auth, ctrlAuth.changePassword);

router.get('/stats/gender-distribution/:unitID', auth, ctrlStatistics.getGenderDistribution);
router.get('/stats/positions-distribution/:unitID', auth, ctrlStatistics.getPositionsDistribution);
router.get('/stats/pole-distribution/:unitID', auth, ctrlStatistics.getPoleDistribution);
router.get('/stats/publications-by-year/:unitID', auth, ctrlStatistics.getPublicationsByYear);

module.exports = router;