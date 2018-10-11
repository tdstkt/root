'use strict';

var _ = require('lodash');
const HttpError = require('http-errors');

const modelsPath = '../models/';
const models = {
    task: require(modelsPath + 'task'),
    discussion: require( modelsPath + 'discussion'),
    project: require(modelsPath + 'project'),
    office: require(modelsPath + 'office'),
    folder: require(modelsPath + 'folder'),
    officeDocument: require(modelsPath + 'document'),
    templateDoc: require(modelsPath + 'templateDoc')
};

function getUpdateEntities(req, res, next) {
    let activities = req.body;
    let allEntities = [];
    let allEntitiesIds = [];

    let Promises = [];

    for(let i in activities) {
        let activity = activities[i];
        let Model = models[activity.issue];

        Promises.push(
            new Promise( resolve => {
                if(_.includes(allEntitiesIds, activity.issueId)){
                    activity.entityObj = allEntities.find( entity => entity._id === activity.issueId );
                    return resolve();
                }

                return Model.findOne({ _id: activity.issueId })
                    .populate('creator')
                    .populate('userObj')
                    .populate('watchers')
                    .populate('project')
                    .populate('folder')
                    .populate('office')
                    .then(doc => {
                        if(!doc) throw new HttpError(404);

                        activity.entityObj = doc;
                        allEntities.push(doc);
                        allEntitiesIds.push(doc._id.toString());
                        return resolve(doc);
                    });
            })

        );
    }
    Promise.all(Promises)
        .then( result => {
            res.status(200).send({activities: activities, entities: allEntities});
        });
}

module.exports = {
    getUpdateEntities,
}