const queries = require('../db/queries/project');
const permissionQueries = require('../db/queries/permissions');
const generalQueries = require('../db/queries/general');

const helpers = require('../_helpers/general');

const validateMemberPermissions = require('../validation/permissions');
const validateProjectRoute = require('../validation/project');

// POST: /organization/:name/project/create-project
async function createProject(ctx) {
    try {
        //TODO: Account for error checking with currency/languageID
        const info = ctx.request.body;
        const params = ctx.params;
        const state = ctx.state;

        let createProject = await queries.createProject(state, params, info);
        if (createProject instanceof Error) throw new Error(createProject);

        createProject.message = ctx.i18n.__('successfullyCreatedProject');

        return helpers.handleResponse(ctx, 200, createProject)
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// PATCH: /organization/:name/project/:projectId
async function modifyProject(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let updateProject = await queries.modifyProject(state, params, info);
        if (updateProject instanceof Error) throw new Error(updateProject.message);

        return helpers.handleResponse(ctx, 200, updateProject);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// POST: /organization/:name/project/:projectId/access/:memberId
async function createProjectAccess(ctx) {
    try {
        const routeParams = ctx.params;
        const state = ctx.state;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(state, routeParams, 'create_project_access');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let findProject = await generalQueries.singleSelectQuery(null, '*', 'project', {
            organization_id: state.organization.id,
            id: routeParams.projectId
        });

        if (!findProject) throw new Error(ctx.i18n.__('projectDoesNotExist'));
        if (findProject instanceof Error) throw new Error(findProject.message);

        let checkMemberExists = await generalQueries.singleSelectQuery(null, '*', 'organization_member', {
            organization_id: state.organization.id,
            id: routeParams.memberId
        });

        if (!checkMemberExists) throw new Error(ctx.i18n.__('cannotFindMember'));
        if (checkMemberExists instanceof Error) throw new Error(checkMemberExists.message);

        let whereParams = {
            organization_id: state.organization.id,
            organization_member: routeParams.memberId,
            project_id: routeParams.projectId
        };

        let checkIfAccessExists = await generalQueries.singleSelectQuery(null, '*', 'project_access', whereParams);
        if (checkIfAccessExists) throw new Error(ctx.i18n.__('projectAccessAlreadyExists'));
        if (checkIfAccessExists instanceof Error) throw new Error(checkIfAccessExists.message);

        whereParams.created_by = state.user.id;

        let addProjectAccess = await generalQueries.insertSingleQuery(null, whereParams, 'project_access', '*');
        if (addProjectAccess instanceof Error) throw new Error(addProjectAccess.message);

        return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('successfullyCreatedProjectAccess')})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// DELETE: /organization/:name/project/:projectId/access/:memberId
async function deleteProjectAccess(ctx) {
    try {
        const routeParams = ctx.params;
        const state = ctx.state;

        let checkPermissions = await validateMemberPermissions.checkUserPermissions(state, routeParams, 'delete_project_access');
        if (checkPermissions instanceof Error) throw new Error(checkPermissions.message);

        let removeProjectAccess = await queries.removeProjectAccess(state, routeParams);
        if (removeProjectAccess instanceof Error) throw new Error(removeProjectAccess.message);

        return helpers.handleResponse(ctx, 200, {message: ctx.i18n.__('successfullyDeletedProjectAccess')})
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message})
    }
}

// POST: /organization/:name/project/:projectId/profile
async function createProfile(ctx) {
    try {
        let createProfile;
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;
        let fields = info.fields;

        // TODO: Should you be able to create a project profile in a language that doesn't exist as an organization profile?

        let getCurrentProfiles = await generalQueries.multiSelectQuery(null, '*', 'project_profile', {
            project_id: params.projectId
        });

        let checkIfLanguageExists = getCurrentProfiles.filter(profile => parseInt(fields.language_id) == profile.language_id);

        if (checkIfLanguageExists.length) throw new Error(ctx.i18n.__('cannotHaveMoreThanOneActiveProfileWithSameLanguage'));
        else createProfile = await queries.createProfile(state, params, info);

        if (createProfile instanceof Error) throw new Error(createProfile.message);

        return helpers.handleResponse(ctx, 200, createProfile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// PATCH: /organization/:name/project/:projectId/profile/:profileId
async function modifyProfile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let getCurrentProfiles = await generalQueries.multiSelectQuery(null, '*', 'project_profile', {
            project_id: params.projectId
        });

        // TODO: Investigate: should test to see if this will mean that they won't be able to edit profile if language id as same as active.

        if (info.language_id) {
            let checkIfLanguageExists = getCurrentProfiles.filter(profile => info.language_id == profile.language_id);
            if (checkIfLanguageExists.length) throw new Error(ctx.i18n.__('cannotHaveMoreThanOneActiveProfileWithSameLanguage'));
        }


        let modifyProfile = await queries.modifyProfile(state, params, info, getCurrentProfiles);

        if (modifyProfile instanceof Error) throw new Error(modifyProfile.message);

        return helpers.handleResponse(ctx, 200, modifyProfile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// DELETE: /organization/:name/project/:projectId/profile/:profileId
async function deleteProfile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;

        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let deleteProfile = await queries.deleteProfile(state, params);
        if (deleteProfile instanceof Error) throw new Error(deleteProfile.message);

        return helpers.handleResponse(ctx, 200, deleteProfile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// POST: /organization/:name/project/:projectId/update
async function createUpdate(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let createUpdate = await queries.createUpdate(state, params, info);
        if (createUpdate instanceof Error) throw new Error(createUpdate.message);

        return helpers.handleResponse(ctx, 200, createUpdate);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// PATCH: /organization/:name/project/:projectId/update/:updateId
async function modifyUpdate(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let modifyUpdate = await queries.modifyUpdate(state, params, info);
        if (modifyUpdate instanceof Error) throw new Error(modifyUpdate.message);

        return helpers.handleResponse(ctx, 200, modifyUpdate);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// DELETE: /organization/:name/project/:projectId/update/:updateId
async function deleteUpdate(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;

        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let deleteUpdate = await queries.deleteUpdate(state, params);
        if (deleteUpdate instanceof Error) throw new Error(deleteUpdate.message);

        return helpers.handleResponse(ctx, 200, deleteUpdate);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// POST: /organization/:name/project/:projectId/update/:updateId/profile
async function createUpdateProfile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let createProfile = await queries.createUpdateProfile(state, params, info);
        if (createProfile instanceof Error) throw new Error(createProfile.message);

        return helpers.handleResponse(ctx, 200, createProfile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});

    }
}

// PATCH: /organization/:name/project/:projectId/update/:updateId/profile/:profileId
async function modifyUpdateProfile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let modifyUpdateProfile = await queries.modifyUpdateProfile(state, params, info);
        if (modifyUpdateProfile instanceof Error) throw new Error(modifyUpdateProfile.message);


        return helpers.handleResponse(ctx, 200, modifyUpdateProfile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});

    }
}

// DELETE: /organization/:name/project/:projectId/update/:updateId/profile/:profileId
async function deleteUpdateProfile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;

        let checkProjectAccess = await validateMemberPermissions.checkProjectAccess(ctx.state, ctx.params);
        if (checkProjectAccess instanceof Error) throw new Error(checkProjectAccess.message);

        let deleteProfile = await queries.deleteUpdateProfile(state, params);
        if (deleteProfile instanceof Error) throw new Error(deleteProfile.message);

        return helpers.handleResponse(ctx, 200, deleteProfile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// POST: /organization/:name/project/:projectId/file
async function createProjectFile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let createProjectFile = await queries.createProjectFile(state, params, info);
        if (createProjectFile instanceof Error) throw new Error(createProjectFile.message);

        return helpers.handleResponse(ctx, 200, createProjectFile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}

// PATCH: /organization/:name/project/:projectId/file/:fileId
async function modifyProjectFile(ctx) {
    try {
        let state = ctx.state;
        let params = ctx.params;
        let info = ctx.request.body;

        let modifyProjectFile = await queries.modifyProjectFile(state, params, info);
        if (modifyProjectFile instanceof Error) throw new Error(modifyProjectFile.message);

        return helpers.handleResponse(ctx, 200, modifyProjectFile);
    }
    catch (err) {
        return helpers.handleResponse(ctx, 401, {message: err.message});
    }
}


module.exports = (router) => {
    router.post('/organization/:name/project/', helpers.passportJWT, validateProjectRoute.createProject, createProject);
    router.patch('/organization/:name/project/:projectId', helpers.passportJWT, validateProjectRoute.modifyProject, modifyProject);

    router.post('/organization/:name/project/:projectId/profile', helpers.passportJWT, validateProjectRoute.createProfile, createProfile);
    router.patch('/organization/:name/project/:projectId/profile/:profileId', helpers.passportJWT, validateProjectRoute.modifyProfile, modifyProfile);
    router.delete('/organization/:name/project/:projectId/profile/:profileId', helpers.passportJWT, deleteProfile);

    router.post('/organization/:name/project/:projectId/update', helpers.passportJWT, validateProjectRoute.createUpdate, createUpdate);
    router.patch('/organization/:name/project/:projectId/update/:updateId', helpers.passportJWT, validateProjectRoute.modifyUpdate, modifyUpdate);
    router.delete('/organization/:name/project/:projectId/update/:updateId', helpers.passportJWT, deleteUpdate);

    router.post('/organization/:name/project/:projectId/update/:updateId/profile', helpers.passportJWT, validateProjectRoute.createUpdateProfile, createUpdateProfile);
    router.patch('/organization/:name/project/:projectId/update/:updateId/profile/:profileId', helpers.passportJWT, validateProjectRoute.modifyUpdateProfile, modifyUpdateProfile);
    router.delete('/organization/:name/project/:projectId/update/:updateId/profile/:profileId', helpers.passportJWT, deleteUpdateProfile);

    router.post('/organization/:name/project/:projectId/access/:memberId', helpers.passportJWT, createProjectAccess);
    router.delete('/organization/:name/project/:projectId/access/:memberId', helpers.passportJWT, deleteProjectAccess);

    router.post('/organization/:name/project/:projectId/file', helpers.passportJWT, validateProjectRoute.createProjectFile, createProjectFile);
    router.patch('/organization/:name/project/:projectId/file/:fileId', helpers.passportJWT, validateProjectRoute.modifyProjectFile, modifyProjectFile);

};
