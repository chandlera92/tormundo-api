const knex = require('../connection');
const general = require('./general');
const moment = require('moment');
const uploadHelpers = require('../../_helpers/uploads');

const awsUrl = 'https://tormundo.s3.eu-west-3.amazonaws.com/';

async function getUpdateProfiles(db, state, params) {
    try {
        if (!db) db = knex;
        let query = await db
            .select(knex.raw('json_agg(distinct pu) as update, json_agg(distinct pup) as update_profiles, json_agg(distinct pp) as project_profiles'))
            .from('project_update as pu')
            .innerJoin('project_update_profile as pup', 'pu.id', 'pup.project_update_id')
            .innerJoin('project_profile as pp', 'pu.project_id', 'pp.project_id')
            .where('pu.id', params.updateId)
            .groupBy('pu.id')
            .then(res => res[0])
            .catch(err => err);

        if (query instanceof Error) throw new Error(query.message);
        if (!query) throw new Error(state.i18n.__('projectUpdateNotFound'));

        return query;
    }
    catch (err) {
        return err
    }
}

function createProject(state, params, info) {
    return knex.transaction(async (trx) => {
        // TODO: Max project capacity check (can only have 5 active projects, etc).
        let insertProjectFile;

        let field = info.fields;
        const coverImage = info.files.cover_image;

        let isPublic = field.public == 'true' ? field.public = true : field.public = false;

        let insertProjectAccess = null;

        let result = {};

        let projectData = {
            organization_id: state.organization.id,
            project_location: field.project_location,
            start_date: field.start_date,
            end_date: field.end_date,
            currency: field.currency,
            goal: field.goal,
            public: field.public,
            created_by: state.user.id,
            public_at: isPublic ? 'now()' : null
        };

        let insertProject = await general.insertSingleQuery(trx, projectData, 'project', '*');
        if (insertProject instanceof Error) throw new Error(insertProject.message);
        result.project = insertProject;

        if (coverImage) {
            let dest = 'organization/' + params.name + '/projects/' + insertProject.id;

            let upload = await uploadHelpers.uploadFile(coverImage, dest, null);
            if (upload instanceof Error) throw new Error(upload.message);

            insertProjectFile = await general.insertSingleQuery(trx, {
                name: 'Project cover image',
                type: coverImage.type,
                description: 'Project cover image.',
                loc: upload.Location,
                key: upload.key,
                project_id: insertProject.id,
                created_by: state.user.id
            }, 'project_file', '*');
            if (insertProjectFile instanceof Error) throw new Error(insertProjectFile.message)
            result.cover_image = insertProjectFile;
        }

        if (state.organization.owner !== state.user.id) {
            insertProjectAccess = await general.insertSingleQuery(trx, {
                organization_id: state.organization.id,
                organization_member: state.user.memberId,
                project_id: insertProject.id,
                created_by: state.user.id
            }, 'project_access', '*');
            result.projectAccess = insertProjectAccess;
            if (insertProjectAccess instanceof Error) throw new Error(insertProjectAccess.message);
        }

        let profileData = {
            project_id: insertProject.id,
            language_id: field.language_id,
            name: field.name,
            description: field.description,
            public: isPublic,
            created_by: state.user.id,
            cover_image: insertProjectFile ? insertProjectFile.id : null,
            language_id: state.organization.language_id
        };

        let insertDefaultProfile = await general.insertSingleQuery(trx, profileData, 'project_profile', '*');
        if (insertDefaultProfile instanceof Error) throw new Error(insertDefaultProfile);

        result.profile = insertDefaultProfile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyProject(state, params, info,) {
    // TODO: Decide limits for certain parameters, like restriction of project length? change amount to be raised? etc.
    return knex.transaction(async (trx) => {
        let fields = info;

        let result = {
            message: state.i18n.__('successfullyUpdatedProject'),
        };

        if (state.project.public == true && fields.public == false) throw new Error(state.i18n.__('cannotSetProjectPublicFlagToFalse'));

        if (fields.public == true && state.project.public == false) {
            let selectProfileFields = ['id as profile_id', 'project_id', 'name', 'description', 'cover_image', 'language_id', 'public'];
            let getMainProfile = await general.singleSelectQuery(trx, selectProfileFields, 'project_profile', {
                project_id: params.projectId,
                language_id: state.organization.language_id
            });

            if (getMainProfile.public == false) {
                getMainProfile.created_by = state.user.id;
                let insertProfileHistory = await general.insertSingleQuery(trx, getMainProfile, 'project_profile_history', '*');
                if (insertProfileHistory instanceof Error) throw new Error(insertProfileHistory.message);

                let updateMainProfile = await general.updateSingleQuery(trx, {
                    public: true,
                    modified_by: state.user.id,
                    modified_at: 'now()'
                }, 'project_profile', {id: getMainProfile.profile_id}, '*');
                if (updateMainProfile instanceof Error) throw new Error(updateMainProfile.message);

                result.mainProfile = state.i18n.__('updatedMainProfileToPublic');
            }
        }

        let returnFields = Object.keys(fields);

        fields.modified_by = state.user.id;
        fields.modified_at = 'now()';

        let updateProject = await general.updateSingleQuery(trx, fields, 'project', {id: params.projectId}, returnFields);
        if (updateProject instanceof Error) throw new Error(updateProject.message);
        state.project.created_at = 'now()';
        state.project.created_by = state.user.id;

        let insertProjectHistory = await general.insertSingleQuery(trx, state.project, 'project_history', returnFields);
        if (insertProjectHistory instanceof Error) throw new Error(insertProjectHistory.message);

        result.updated = updateProject;
        result.from = insertProjectHistory;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function createProfile(state, params, info) {
    return knex.transaction(async (trx) => {

        let result = {message: state.i18n.__('successfullyCreatedProfile')},
            insertProjectFile;

        let files = info.files;
        let fields = info.fields;
        let insertNewProfileData = fields;
        let coverImage = files.cover_image;

        if (coverImage) {
            let dest = 'organization/' + params.name + '/projects/' + params.projectId;

            let upload = await uploadHelpers.uploadFile(coverImage, dest, null);
            if (upload instanceof Error) throw new Error(upload.message);

            insertProjectFile = await general.insertSingleQuery(trx, {
                name: 'Project cover image',
                type: coverImage.type,
                description: 'Project cover image.',
                loc: upload.Location,
                key: upload.key,
                project_id: params.projectId,
                created_by: state.user.id
            }, 'project_file', '*');

            if (insertProjectFile instanceof Error) throw new Error(insertProjectFile.message);

            insertNewProfileData.cover_image = insertProjectFile.id;
            result.cover_image = insertProjectFile;
        }

        insertNewProfileData.project_id = params.projectId;
        insertNewProfileData.created_by = state.user.id;

        let insertNewProfile = await general.insertSingleQuery(trx, insertNewProfileData, 'project_profile', '*');
        if (insertNewProfile instanceof Error) throw new Error(insertNewProfile.message);

        result.profile = insertNewProfile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyProfile(state, params, info, currentProfiles) {
    return knex.transaction(async (trx) => {
        let returnKeys = Object.keys(info);

        let result = {message: state.i18n.__('successfullyUpdatedProfile')};

        let getCurrentProfile = currentProfiles.filter(profile => profile.id == params.profileId)[0];
        if (!getCurrentProfile) throw new Error(state.i18n.__('cannotFindProjectProfile'));

        if (getCurrentProfile.language_id == state.organization.language_id) {
            if (info.public == false && state.project.public == true) throw new Error(state.i18n.__('cannotSetMainProfileToNotPublicIfProjectIsLive'));
            if (info.language_id && info.language_id !== state.organization.language_id) throw new Error(state.i18n.__('cannotChangeLanguageOfMainProfile'));
        }

        getCurrentProfile.profile_id = getCurrentProfile.id;

        ['modified_by', 'modified_at', 'id'].forEach(item => delete getCurrentProfile[item]);

        let insertProfileHistory = await general.insertSingleQuery(trx, getCurrentProfile, 'project_profile_history', returnKeys);
        if (insertProfileHistory instanceof Error) throw new Error(insertProfileHistory.message);

        info.modified_by = state.user.id;
        info.modified_at = 'now()';

        let updateProfile = await general.updateSingleQuery(trx, info, 'project_profile', {id: params.profileId}, returnKeys);
        if (updateProfile instanceof Error) throw new Error(updateProfile.message);

        result.updated = updateProfile;
        result.from = insertProfileHistory;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function deleteProfile(state, params) {
    return knex.transaction(async (trx) => {
        let result = {message: state.i18n.__('successfullyDeletedProjectProfile')};

        // TODO: Critically analyse this, check that people can't be part of a different organization but access anothers profile. (I think it's okay?)
        let getProfile = await general.singleSelectQuery(trx, '*', 'project_profile', {id: params.profileId, project_id: state.project.project_id});
        if (getProfile instanceof Error) throw new Error(getProfile.message);
        if (!getProfile) throw new Error(state.i18n.__('cannotFindProjectProfile'));

        if (getProfile.language_id == state.organization.language_id) throw new Error(state.i18n.__('cannotDeleteMainProfile'));

        let removalInfo = {
            profile_id: getProfile.id,
            project_id: getProfile.project_id,
            language_id: getProfile.language_id,
            created_by: getProfile.created_by,
            created_at: getProfile.created_at,
            name: getProfile.title,
            description: getProfile.body,
            public: getProfile.public,
            cover_image: getProfile.cover_image,
            removed_by: state.user.id,
            removed_at: 'now()'
        };

        let insertProfileRemoved = await general.insertSingleQuery(trx, removalInfo, 'project_profile_removed', '*');
        if (insertProfileRemoved instanceof Error) throw new Error(insertProfileRemoved);

        let removeProfile = await general.deleteQuery(trx, {id: params.profileId}, 'project_profile', '*');
        if (removeProfile instanceof Error) throw new Error(removeProfile.message);

        result.removed = removeProfile[0];

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function createUpdate(state, params, info) {
    return knex.transaction(async (trx) => {
        let result = {message: state.i18n.__('successfullyCreatedProjectUpdate')};
        let updateInfo = {project_id: params.projectId, public: info.public, created_by: state.user.id};

        let insertUpdate = await general.insertSingleQuery(trx, updateInfo, 'project_update', '*');
        if (insertUpdate instanceof Error) throw new Error(insertUpdate.message);

        info.project_update_id = insertUpdate.id;
        info.created_by = state.user.id;
        info.language_id = state.organization.language_id;

        let insertUpdateProfile = await general.insertSingleQuery(trx, info, 'project_update_profile', '*');
        if (insertUpdateProfile instanceof Error) throw new Error(insertUpdateProfile.message);

        result.project_update = insertUpdateProfile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyUpdate(state, params, info) {
    return knex.transaction(async (trx) => {
        let result = {message: state.i18n.__('successfullyModifiedProjectUpdate')};
        let infoKeys = Object.keys(info);

        if (info.public) {
            let getMainProfile = await general.singleSelectQuery(trx, '*', 'project_update_profile', {
                language_id: state.organization.language_id,
                project_update_id: params.updateId,
                public: true
            });
            if (!getMainProfile) throw new Error(state.i18n.__('mainProfileMustBeSetToPublicBeforeUpdate'));
        }

        let getUpdate = await general.singleSelectQuery(trx, '*', 'project_update', {id: params.updateId});
        if (getUpdate instanceof Error) throw new Error(getUpdate.message);
        if (!getUpdate) throw new Error(state.i18n.__('projectUpdateNotFound'));

        let updateHistory = {
            project_update_id: getUpdate.id,
            public: getUpdate.public,
            created_by: getUpdate.modified_by == null ? getUpdate.created_by : getUpdate.modified_by,
            created_at: getUpdate.modified_at == null ? getUpdate.created_at : getUpdate.modified_at
        };

        let insertHistory = await general.insertSingleQuery(trx, updateHistory, 'project_update_history', infoKeys);
        if (insertHistory instanceof Error) throw new Error(insertHistory.message);

        info.modified_by = state.user.id;
        info.modified_at = 'now()';

        let modifyUpdate = await general.updateSingleQuery(trx, info, 'project_update', {id: params.updateId}, '*');
        if (modifyUpdate instanceof Error) throw new Error(modifyUpdate.message);

        result.from = insertHistory;
        result.updated = modifyUpdate;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function deleteUpdate(state, params) {
    return knex.transaction(async (trx) => {
        let result = {message: state.i18n.__('successfullyDeletedProjectUpdate')};

        let getData = await getUpdateProfiles(trx, state, params);

        if (getData instanceof Error) throw new Error(getData.message);
        if (!getData) throw new Error(state.i18n.__('projectUpdateNotFound'));

        let update = getData.update[0];

        let deleteProfiles = [], profileHistory = [];

        for (let profile of getData.update_profiles) {
            deleteProfiles.push(profile.id);
            profileHistory.push({
                project_profile_id: profile.id,
                language_id: profile.language_id,
                created_by: profile.created_by,
                created_at: profile.created_at,
                title: profile.title,
                body: profile.body,
                public: profile.public,
                removed_by: state.user.id,
                removed_at: 'now()'
            })
        }

        let removeProfiles = await general.deleteMultipleRecords(trx, 'project_update_profile', 'id', deleteProfiles, '*');
        if (removeProfiles instanceof Error) throw new Error(removeProfiles.message);

        let insertProfileHistory = await general.insertQuery(trx, profileHistory, 'project_update_profile_removed', '*');
        if (insertProfileHistory instanceof Error) throw new Error(insertProfileHistory.message);

        let updateHistoryInfo = {
            project_update_id: update.id,
            created_by: update.created_by,
            created_at: update.created_at,
            public: update.public,
            removed_by: state.user.id,
            removed_at: 'now()'
        }

        let insertUpdateHistory = await general.insertQuery(trx, updateHistoryInfo, 'project_update_removed', '*');
        if (insertUpdateHistory instanceof Error) throw new Error(insertUpdateHistory);

        let removeUpdate = await general.deleteQuery(trx, {id: update.id}, 'project_update', '*');
        if (removeUpdate instanceof Error) throw new Error(removeUpdate.message);

        result.removed = removeUpdate[0];

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function createUpdateProfile(state, params, info) {
    return knex.transaction(async (trx) => {

        let result = {message: state.i18n.__('successfullyCreatedProjectUpdateProfile')};

        // TODO: Modify based on modifyUpdateProfileCode?

        let getUpdateAndProfiles = await getUpdateProfiles(trx, state, params);
        if (getUpdateAndProfiles instanceof Error) throw new Error(getUpdateAndProfiles.message);

        let checkIfProfileLanguageExists = getUpdateAndProfiles.project_profiles.filter(profile => profile.language_id == info.language_id);
        if (checkIfProfileLanguageExists.length == 0) throw new Error(state.i18n.__('cannotCreateUpdateForProjectInThisLanguage'));

        let checkIfUpdateProfileLanguageExists = getUpdateAndProfiles.update_profiles.filter(profile => profile.language_id == info.language_id);
        if (checkIfUpdateProfileLanguageExists.length) throw new Error(state.i18n.__('projectUpdateProfileAlreadyExistsInThisLanguage'));

        info.created_by = state.user.id;
        info.project_update_id = params.updateId;

        let createProfile = await general.insertSingleQuery(trx, info, 'project_update_profile', '*');
        if (createProfile instanceof Error) throw new Error(createProfile.message);


        result.profile = createProfile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyUpdateProfile(state, params, info) {
    return knex.transaction(async (trx) => {

        let result = {message: state.i18n.__('successfullyModifiedProjectUpdateProfile')};

        let getUpdateAndProfiles = await getUpdateProfiles(trx, state, params);
        if (getUpdateAndProfiles instanceof Error) throw new Error(getUpdateAndProfiles.message);

        let update = getUpdateAndProfiles.update[0];

        let activeProfile = getUpdateAndProfiles.update_profiles.find(profile => profile.id == parseInt(params.profileId));
        if (!activeProfile) throw new Error(state.i18n.__('projectUpdateProfileNotFound'));
        /* If you are wondering why this method of handling setting public to false is different than to profiles, it is because:
        *  With a project update, there is no problem if the update is hidden/deleted at any time, so we can automatically update it to this if the profile public flag is set to false.
        */
        if (activeProfile.language_id == state.organization.language_id) {
            if (info.language_id && info.language_id !== state.organization.language_id) throw new Error(state.i18n.__('cannotChangeLanguageOfMainProfile'));
            if (info.public == false && update.public == true) {
                const updateHistory = {
                    project_update_id: update.id,
                    public: update.public,
                    created_by: state.user.id,
                    created_at: 'now()'
                };
                let insertProjectUpdateHistory = await general.insertSingleQuery(trx, updateHistory, 'project_update_history', '*');
                if (insertProjectUpdateHistory instanceof Error) throw new Error(insertProjectUpdateHistory);

                let updateProjectUpdate = await general.updateSingleQuery(trx, {
                    public: false,
                    modified_at: 'now()',
                    modified_by: state.user.id
                }, 'project_update', {id: params.updateId}, '*');

                if (updateProjectUpdate instanceof Error) throw new Error(updateProjectUpdate);

                result.warning = state.i18n.__('setProjectUpdatePublicFlagToFalse');
            }

        }

        else if (info.language_id) {
            let checkIfProfileLanguageExists = getUpdateAndProfiles.project_profiles.filter(profile => profile.language_id == info.language_id);
            if (checkIfProfileLanguageExists.length == 0) throw new Error(state.i18n.__('cannotCreateUpdateForProjectInThisLanguage'));

            let checkIfUpdateProfileLanguageExists = getUpdateAndProfiles.update_profiles.filter(profile => profile.language_id == info.language_id && profile.id !== parseInt(params.profileId));
            if (checkIfUpdateProfileLanguageExists.length) throw new Error(state.i18n.__('projectUpdateProfileAlreadyExistsInThisLanguage'));
        }

        let insertProjectUpdateHistory = {
            project_profile_id: activeProfile.id,
            language_id: activeProfile.language_id,
            created_by: state.user.id,
            created_at: 'now()',
            title: activeProfile.title,
            body: activeProfile.body,
            public: activeProfile.public
        };

        const returnKeys = Object.keys(info);

        let insertProjectUpdateProfileHistory = await general.insertSingleQuery(trx, insertProjectUpdateHistory, 'project_update_profile_history', returnKeys);

        if (insertProjectUpdateProfileHistory instanceof Error) throw new Error(insertProjectUpdateProfileHistory.message);

        let modifyProjectUpdateProfile = await general.updateSingleQuery(trx, Object.assign({
            modified_by: state.user.id,
            modified_at: 'now()'
        }, info), 'project_update_profile', {id: params.profileId}, returnKeys);

        if (modifyProjectUpdateProfile instanceof Error) throw new Error(modifyProjectUpdateProfile.message);

        result.updated = modifyProjectUpdateProfile;
        result.from = insertProjectUpdateProfileHistory;


        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function deleteUpdateProfile(state, params) {
    return knex.transaction(async (trx) => {
        let result = {message: state.i18n.__('successfullyDeletedProjectUpdateProfile')};

        let getData = await getUpdateProfiles(trx, state, params);
        if (getData instanceof Error) throw new Error(getData.message);

        let activeProfile = getData.update_profiles.find(profile => profile.id == parseInt(params.profileId));
        if (!activeProfile) throw new Error(state.i18n.__('projectUpdateProfileNotFound'));

        if (activeProfile.language_id == state.organization.language_id) throw new Error(ctx.i18n.__('cannotDeleteMainProfile'));

        let removalInfo = {
            project_profile_id: activeProfile.id,
            language_id: activeProfile.language_id,
            created_by: activeProfile.created_by,
            created_at: activeProfile.created_at,
            title: activeProfile.title,
            body: activeProfile.body,
            public: activeProfile.public,
            removed_by: state.user.id,
            removed_at: 'now()'
        };


        let insertProfileRemoved = await general.insertSingleQuery(trx, removalInfo, 'project_update_profile_removed', '*');
        if (insertProfileRemoved instanceof Error) throw new Error(insertProfileRemoved);

        let removeProfile = await general.deleteQuery(trx, {id: params.profileId}, 'project_update_profile', '*');
        if (removeProfile instanceof Error) throw new Error(removeProfile.message);

        result.removed = removeProfile[0];

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function createProjectFile(state, params, info) {
    return knex.transaction(async (trx) => {
        let fields = info.fields;
        let files = info.files;

        let result = {message: state.i18n.__('successfullyUploadedProjectFile')};

        let dest = 'organization/' + params.name + '/projects/' + state.project.project_id;
        const getFile = files.file;
        let upload = await uploadHelpers.uploadFile(getFile, dest, state.projectFiles);
        if (upload instanceof Error) throw new Error(upload.message);

        let insertProjectFile = await general.insertSingleQuery(trx, {
            name: fields.name,
            type: getFile.type,
            description: fields.description,
            loc: upload.Location,
            key: upload.key,
            project_id: state.project.project_id,
            created_by: state.user.id,
            created_at: 'now()'
        }, 'project_file', '*');

        if (insertProjectFile instanceof Error) throw new Error(insertProjectFile.message);

        result.projectFile = insertProjectFile;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function modifyProjectFile(state, params, info) {
    return knex.transaction(async (trx) => {
        let fields = info.fields;
        let files = info.files;

        let getCurrentFile = state.projectFiles.filter(file => file.id == params.fileId)[0];
        if (!getCurrentFile) throw new Error(state.i18n.__('cannotFindProjectFile'));

        let insertFileHistoryInfo = {
            project_file_id: getCurrentFile.id,
            name: getCurrentFile.name,
            description: getCurrentFile.description,
            type: getCurrentFile.type,
            key: getCurrentFile.key,
            loc: getCurrentFile.loc,
            created_at: 'now()',
            created_by: state.user.id
        };

        let updateInfo = Object.assign({}, fields);

        let result = {message: state.i18n.__('successfullyModifiedProjectFile')};

        const getNewFile = files.file;

        if (getNewFile) {
            let dest = 'organization/' + params.name + '/projects/' + state.project.project_id;
            let modifyFileUpload = await uploadHelpers.modifyFile(getNewFile, getCurrentFile, dest, state.projectFiles);
            if (modifyFileUpload instanceof Error) throw new Error(modifyFileUpload.message);
            updateInfo.key = modifyFileUpload.uploaded.key;
            updateInfo.loc = modifyFileUpload.uploaded.Location;
            updateInfo.type = getNewFile.type;
            insertFileHistoryInfo.key = modifyFileUpload.moved.key;
            insertFileHistoryInfo.loc = awsUrl + modifyFileUpload.moved.key;
        }

        let returnKeys = Object.keys(updateInfo);

        updateInfo.modified_at = 'now()';
        updateInfo.modified_by = state.user.id;

        let insertFileHistory = await general.insertSingleQuery(trx, insertFileHistoryInfo, 'project_file_history', returnKeys);
        if (insertFileHistory instanceof Error) throw new Error(insertFileHistory.message);

        let updateFile = await general.updateSingleQuery(trx, updateInfo, 'project_file', {id: getCurrentFile.id}, ['modified_at', 'modified_by', ...returnKeys]);
        if (updateFile instanceof Error) throw new Error(updateFile.info);

        result.updated = updateFile;
        result.from = insertFileHistory;

        return result;
    })
        .then(res => res)
        .catch(err => err);
}

function removeProjectAccess(state, params) {
    return knex.transaction(async (trx) => {
        let whereParams = {
            organization_id: state.organization.id,
            organization_member: params.memberId,
            project_id: params.projectId
        };

        let deleteProjectAccess = await general.deleteQuery(null, whereParams, 'project_access', '*');
        if (deleteProjectAccess.length == 0) throw new Error(state.i18n.__('recordDoesNotExist'));
        if (deleteProjectAccess instanceof Error) throw new Error(deleteProjectAccess.message)

        let projectAccessHistory = Object.assign({}, deleteProjectAccess[0]);

        projectAccessHistory.removed_by = state.user.id;
        delete projectAccessHistory.id;

        let insertHistory = await general.insertSingleQuery(trx, projectAccessHistory, 'project_access_history', '*');
        if (insertHistory instanceof Error) throw new Error(insertHistory.message);

        return deleteProjectAccess;
    })
        .then(res => res)
        .catch(err => err);
}


module.exports = {
    createProject,
    modifyProject,
    createProfile,
    modifyProfile,
    deleteProfile,
    createUpdate,
    modifyUpdate,
    deleteUpdate,
    createUpdateProfile,
    modifyUpdateProfile,
    deleteUpdateProfile,
    createProjectFile,
    modifyProjectFile,
    removeProjectAccess
};