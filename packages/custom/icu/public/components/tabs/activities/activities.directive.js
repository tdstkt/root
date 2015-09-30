'use strict';

angular.module('mean.icu.ui.tabs')
    .directive('icuTabsActivities', function () {
        function controller($scope, UsersService, context, DocumentsService, ActivitiesService, $stateParams, $state) {
            $scope.activity = {
                description: ''
            };

            $scope.details = {
                create: 'createdThis',
                update: 'updatedThis ',
                document: 'addDocument',
                comment: 'addComment'
            };

            UsersService.getMe().then(function (user) {
                $scope.me = user;
                $scope.activity.user = user;
            });

            $scope.upload = function (files) {
                $scope.attachments = files;
            };

            var clearForm = function () {
                $scope.attachments = [];
                $scope.activity = {
                    description: ''
                };
            };

            $scope.save = function () {
                $scope.activity.issue = $stateParams.id ? context.main.slice(0, -1) : context.entityName;
                $scope.activity.issueId = $stateParams.id || $stateParams.entityId;
                $scope.activity.type = $scope.attachments ? 'document' : 'comment';

                ActivitiesService.create($scope.activity).then(function (result) {
                    if (!_.isEmpty($scope.attachments)) {
                        var file = $scope.attachments;
                        var data = {
                            issueId: result._id,
                            issue: 'update',
                            entity: $stateParams.id ? context.main.slice(0, -1) : context.entityName,
                            entityId: $stateParams.id || $stateParams.entityId
                        };

                        DocumentsService.saveAttachments(data, file).success(function(attachment) {
                            result.attachments.push(attachment[0]);
                        });
                    }
                    clearForm();

                    $scope.activities.push(result);
                });
            };
        }

        function link($scope, $element) {
            var listExpandContract = function () {
                var activityList = $element.find('.activities-list');
                if (activityList.children().length > 1) {
                    if (activityList.height() <= 70) {
                        activityList.css("max-height", "100%");
                    }
                    else {
                        activityList.css("max-height", "70px");
                    }
                }
            };
            $element.on('click', listExpandContract);
        }

        return {
            restrict: 'A',
            scope: {
                activities: '=',
                entity: '=',
                entityName: '@'
            },
            replace: true,
            controller: controller,
            link: link,
            templateUrl: '/icu/components/tabs/activities/activities.html'
        };
    });
