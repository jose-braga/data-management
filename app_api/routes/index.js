var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

var auth = jwt({
    secret: process.env.JWT_SECRET,
    requestProperty: 'payload'
});


// TODO: remove verbs from URLs (e.g. 'update', 'delete')
// TODO: substitute Uppercase in URLs by '-' (administrativeOffices to administrative-offices)

var ctrlPeopleData = require('../controllers/people.js');
var ctrlTeamData = require('../controllers/team.js');
var ctrlManagerData = require('../controllers/manager.js');
var ctrlPublicationsData = require('../controllers/publications.js');

var ctrlRegistrationData = require('../controllers/registration.js');
var ctrlPreRegistrationData = require('../controllers/pre-registration.js');
var ctrlAuth = require('../controllers/authentication.js');

/**************************** PUBLIC API ENDPOINTS ****************************/
// GET search for person name
router.get('/person', ctrlPeopleData.searchPeople);
router.get('/labs', ctrlPeopleData.getLabMembers);
// GET lists for several purposes (no need to authenticate)
router.get('/lists/:listOf', ctrlPeopleData.listOf);


/**************************** APP SPECIFIC ENDPOINTS ****************************/

// GET lists of non-confidential information about people
router.get('/people', ctrlPeopleData.listActivePeople);
router.get('/people/all', ctrlPeopleData.listAllPeople); //should come before GET /people/:personID


// GET specific data of a person
router.get('/people/:personID', auth, ctrlPeopleData.listPersonData);

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
router.put('/people/lab-affiliations/:personID', auth, ctrlPeopleData.updateAffiliationsLabPerson);
router.put('/people/technician-affiliations/:personID', auth, ctrlPeopleData.updateTechnicianAffiliationsPerson);
router.put('/people/science-manager-affiliations/:personID', auth, ctrlPeopleData.updateScienceManagerAffiliationsPerson);
router.put('/people/administrative-affiliations/:personID', auth, ctrlPeopleData.updateAdministrativeAffiliationsPerson);
router.put('/people/department-affiliations/:personID', auth, ctrlPeopleData.updateAffiliationsDepartmentPerson);
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

router.get('/labs/:teamID/people', auth, ctrlTeamData.listLabPeopleData);
router.get('/facilities/:teamID/people', auth, ctrlTeamData.listTechPeopleData);
router.get('/science-management-offices/:teamID/people', auth, ctrlTeamData.listScManPeopleData);
router.get('/administrative-offices/:teamID/people', auth, ctrlTeamData.listAdmPeopleData);

// PUT (Update) TEAM information (authenticated)
router.put('/team/people-lab/:teamID', auth, ctrlTeamData.updateLabPeople);
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
router.put('/manager/people/all', auth, ctrlManagerData.updateAllPeopleData);

// GET PUBLICATION information (authenticated)
router.get('/publications/person/:personID', auth, ctrlPublicationsData.listPersonPublications);



// POST (Create) new user (authenticated)
router.post('/registration', auth, ctrlRegistrationData.addPerson);

// API endpoint for autentication to pre-registration
router.post('/pre-registration', ctrlAuth.preRegistration);

// POST new user data on pre.registration
router.post('/pre-registration/data', auth, ctrlPreRegistrationData.preRegisterPerson);
router.get('/pre-registration/people/:personID', auth, ctrlPreRegistrationData.getPersonData);

// API points for authentication
//router.post('/register', ctrlAuth.register); // registration will be done afterwards
router.post('/login', ctrlAuth.login);
//only authenticated requests can change password
router.put('/change-password/:userID', auth, ctrlAuth.changePassword);

module.exports = router;