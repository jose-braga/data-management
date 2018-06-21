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
router.put('/people/nuclear-info/:personID', auth, ctrlPeopleData.updateNuclearInfoPerson);
router.put('/people/contact-info/:personID', auth, ctrlPeopleData.updateContactInfoPerson);
router.put('/people/identifications/:personID', auth, ctrlPeopleData.updateIdentificationsInfoPerson);
router.put('/people/institutional-contacts/:personID', auth, ctrlPeopleData.updateInstitutionalContactsPerson);
router.put('/people/emergency-contacts/:personID', auth, ctrlPeopleData.updateEmergencyContactsPerson);
router.put('/people/finished-degrees/:personID', auth, ctrlPeopleData.updateFinishedDegreesPerson);
router.put('/people/ongoing-degrees/:personID', auth, ctrlPeopleData.updateOngoingDegreesPerson);
router.put('/people/jobs/:personID', auth, ctrlPeopleData.updateJobsPerson);
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
router.get('/labs/:teamID', auth, ctrlTeamData.listLabData);

router.get('/labs/:groupID/:teamID/people', auth, ctrlTeamData.listLabPeopleData);
router.get('/facilities/:teamID/people', auth, ctrlTeamData.listTechPeopleData);
router.get('/science-management-offices/:teamID/people', auth, ctrlTeamData.listScManPeopleData);
router.get('/administrative-offices/:teamID/people', auth, ctrlTeamData.listAdmPeopleData);

// PUT (Update) TEAM information (authenticated)
router.put('/team/people-lab/:groupID/:teamID', auth, ctrlTeamData.updateLabPeople);
router.put('/team/people-technician/:teamID', auth, ctrlTeamData.updateTechPeople);
router.put('/team/people-science-manager/:teamID', auth, ctrlTeamData.updateScManPeople);
router.put('/team/people-administrative/:teamID', auth, ctrlTeamData.updateAdmPeople);
router.post('/team/pre-register', auth, ctrlTeamData.preRegister);

// GET MANAGER information (authenticated)
router.get('/manager/people/all-with-roles', auth, ctrlManagerData.listAllPeopleWithRolesData);
router.get('/manager/people/all-no-roles', auth, ctrlManagerData.listAllPeopleNoRolesData);
router.get('/manager/people/validate', auth, ctrlManagerData.listPeopleValidate);
// PUT (updated) MANAGER information (authenticated)
router.put('/manager/people/validate/:personID', auth, ctrlManagerData.validatePerson);
router.put('/manager/people/password-reset/:personID', auth, ctrlManagerData.passwordReset);
router.put('/manager/people/user-permissions/:personID', auth, ctrlManagerData.updateUserPermissions);
router.put('/manager/people/all', auth, ctrlManagerData.updateAllPeopleData);

// GET PUBLICATION information (authenticated)
router.get('/publications/all', auth, ctrlProductivityData.listAllPublications);
router.get('/publications/person/:personID', auth, ctrlProductivityData.listPersonPublications);

router.get('/publications/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersPublications);
router.get('/publications/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamPublications);
router.get('/communications/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersCommunications);
router.get('/communications/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamCommunications);
router.get('/patents/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersPatents);
router.get('/patents/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamPatents);
router.get('/prizes/team/:groupID/:teamID/members', auth, ctrlProductivityData.listMembersPrizes);
router.get('/prizes/team/:groupID/:teamID', auth, ctrlProductivityData.listTeamPrizes);


router.get('/communications/person/:personID', auth, ctrlProductivityData.listPersonCommunications);
router.get('/patents/all', auth, ctrlProductivityData.listPatents);
router.get('/patents/person/:personID', auth, ctrlProductivityData.listPersonPatents);
router.get('/prizes/all', auth, ctrlProductivityData.listPrizes);
router.get('/prizes/person/:personID', auth, ctrlProductivityData.listPersonPrizes);
router.get('/datasets/all', auth, ctrlProductivityData.listDatasets);
router.get('/datasets/person/:personID', auth, ctrlProductivityData.listPersonDatasets);
router.get('/startups/all', auth, ctrlProductivityData.listStartups);
router.get('/startups/person/:personID', auth, ctrlProductivityData.listPersonStartups);
router.get('/boards/person/:personID', auth, ctrlProductivityData.listPersonBoards);
router.get('/outreaches/person/:personID', auth, ctrlProductivityData.listPersonOutreaches);

// PUT PUBLICATION information (authenticated)
router.put('/publications/person/:personID/selected', auth, ctrlProductivityData.updatePersonSelectedPub);
router.put('/publications/person/:personID/author-names', auth, ctrlProductivityData.updatePersonAuthorNames);
router.put('/publications/person/:personID/delete', auth, ctrlProductivityData.deletePublicationsPerson);
router.put('/publications/person/:personID/add', auth, ctrlProductivityData.addPublicationsPerson);
router.put('/publications/person/:personID/add-orcid', auth, ctrlProductivityData.addORCIDPublicationsPerson);
router.put('/publications/team/:groupID/:teamID', auth, ctrlProductivityData.addPublicationsLab);
router.put('/publications/team/:groupID/:teamID/selected', auth, ctrlProductivityData.updateTeamSelectedPub);
router.put('/publications/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deletePublicationsTeam);

router.put('/communications/team/:groupID/:teamID', auth, ctrlProductivityData.addCommunicationsLab);
router.put('/communications/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deleteCommunicationsTeam);
router.put('/patents/team/:groupID/:teamID', auth, ctrlProductivityData.addPatentsLab);
router.put('/patents/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deletePatentsTeam);
router.put('/prizes/team/:groupID/:teamID', auth, ctrlProductivityData.addPrizesLab);
router.put('/prizes/team/:groupID/:teamID/delete', auth, ctrlProductivityData.deletePrizesTeam);


router.put('/communications/person/:personID', auth, ctrlProductivityData.updatePersonCommunications);
router.put('/communications/person/:personID/add-orcid', auth, ctrlProductivityData.addORCIDCommunicationsPerson);
router.put('/communications/person/:personID/add', auth, ctrlProductivityData.addORCIDCommunicationsPerson); // both use the same function
router.put('/patents/person/:personID', auth, ctrlProductivityData.updatePersonPatents);
router.put('/prizes/person/:personID', auth, ctrlProductivityData.updatePersonPrizes);
router.put('/datasets/person/:personID', auth, ctrlProductivityData.updatePersonDatasets);
router.put('/startups/person/:personID', auth, ctrlProductivityData.updatePersonStartups);
router.put('/boards/person/:personID', auth, ctrlProductivityData.updatePersonBoards);
router.put('/outreaches/person/:personID', auth, ctrlProductivityData.updatePersonOutreaches);

// POST (Create) new user (authenticated)
router.post('/registration', auth, ctrlRegistrationData.addPerson);

// API endpoint for autentication to pre-registration
router.post('/pre-registration', ctrlAuth.preRegistration);

// POST new user data on pre.registration
router.post('/pre-registration/data', auth, ctrlPreRegistrationData.preRegisterPerson);
router.post('/pre-registration/photo/:personID/:imageType', auth, ctrlPreRegistrationData.updatePhoto);
router.get('/pre-registration/people/:personID', auth, ctrlPreRegistrationData.getPersonData);

// API points for authentication
//router.post('/register', ctrlAuth.register); // registration will be done afterwards
router.post('/login', ctrlAuth.login);
//only authenticated requests can change password
router.put('/change-password/:userID', auth, ctrlAuth.changePassword);

module.exports = router;