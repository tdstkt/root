'use strict';

angular.module('mean.icu.ui.projectdetails', []).controller('ProjectDetailsController', ProjectDetailsController);

function ProjectDetailsController($scope, $rootScope, entity, tags, people, projects, subprojects, $timeout, context, $state, ProjectsService, ActivitiesService, TasksService, PermissionsService, EntityService, $stateParams, me, $window, $uibModal, DetailsPaneService) {

  // ==================================================== init ==================================================== //

  $scope.tabs = DetailsPaneService.orderTabs(['activities', 'documents', 'tasks']);

  $scope.item = entity || context.entity;

  if(!$scope.item) {
    switch($state.current.name) {
      case 'main.tasks.byentity.tasks':
        $state.go('.' + window.config.defaultTab);
        break;
      default:
        $state.go('main.projects.byentity', {
          entity: context.entityName,
          entityId: context.entityId
        });
        break;
    }
  } else if($scope.item) {
    switch($state.current.name) {
      case 'main.projects.all.details':
      case 'main.search.project':
      case 'main.projects.byentity.details':
        $state.go('.' + window.config.defaultTab);
        break;
    }
  }

  $scope.items = projects.data || projects;
  $scope.item.subProjects = subprojects.data || subprojects;

  $scope.editorOptions = {
    theme: 'bootstrap',
    buttons: ['bold', 'italic', 'underline', 'anchor', 'quote', 'orderedlist', 'unorderedlist']
  };

  $scope.statuses = ['new', 'assigned', 'in-progress', 'canceled', 'done', 'archived'];

  $scope.me = me;
  $scope.tags = tags || [];

  let currentState = $state.current.name;

  // backup for previous changes - for updates
  var backupEntity = angular.copy($scope.item);

  $scope.people = people;

  ProjectsService.getStarred().then(function(starred) {
    $scope.item.star = _(starred).any(function(s) {
      return s._id === $scope.item._id;
    });
  });

  // ==================================================== onChanges ==================================================== //

  $scope.onStar = function(value) {

    $scope.update($scope.item, {
      name: 'star'
    });

    ProjectsService.star($scope.item).then(function() {
      $state.reload();
    });
  };

  $scope.onAssign = function(value) {
    $scope.item.assign = value;
    $scope.updateAndNotify($scope.item);
  };

  $scope.onDateDue = function(value) {
    $scope.item.due = value;
    if(context.entityName === 'discussion') {
      $scope.item.discussion = context.entityId;
    }

    ProjectsService.updateDue($scope.item, $scope.me, backupEntity).then(function (result) {
      backupEntity = angular.copy($scope.item);
      ActivitiesService.data.push(result);
    });

    ProjectsService.update($scope.item).then(function() {
      $state.reload();
    });
  };

  $scope.onStatus = function(value) {
    $scope.item.status = value;
    $scope.update($scope.item, {
      name: 'status'
    });
  };

  $scope.onColor = function(value) {
    $scope.update($scope.item, value);
  };

  $scope.onCategory = function(value) {
    $scope.item.discussion = value;
    $scope.update($scope.item, 'discussion');
  }

  $scope.onWantToCreateRoom = function() {
    $scope.item.WantRoom = true;
    $scope.update($scope.item, context);

    ProjectsService.WantToCreateRoom($scope.item).then(function(data) {
      $state.reload();
      if(data.roomName) {
        $window.open(window.config.rocketChat.uri + '/group/' + data.roomName);
        return true;
      }
      else {
        return false;
      }
    });
  };

  $scope.onTags = function(value) {
    $scope.item.tags = value;
    $scope.update($scope.item, {name: 'tags'});
  };

  // ==================================================== Menu events ==================================================== //

  $scope.recycle = function() {
    ProjectsService.removeFromParent($scope.item).then(()=>{
      EntityService.recycle('projects', $scope.item._id).then(function() {
        $scope.item.recycled = new Date();
        let clonedEntity = angular.copy($scope.item);
        clonedEntity.status = 'Recycled';
        // just for activity status
        ProjectsService.updateStatus(clonedEntity, $scope.item).then(function(result) {
          ActivitiesService.data.push(result);
        });
        refreshList();
        $state.go('^.^');
        $scope.isRecycled = $scope.item.hasOwnProperty('recycled');
        $scope.permsToSee();
        $scope.havePermissions();
        $scope.haveEditiorsPermissions();
      });
    }
    );
  };

  $scope.recycleRestore = function() {
    ProjectsService.addToParent($scope.item).then(()=>{
      EntityService.recycleRestore('projects', $scope.item._id).then(function() {
        let clonedEntity = angular.copy($scope.item);
        clonedEntity.status = 'un-deleted';
        // just for activity status
        ProjectsService.updateStatus(clonedEntity, $scope.item).then(function(result) {
          ActivitiesService.data.push(result);
        });
        refreshList();
        $state.go('^.^');
      });
    }
    );
  };

  $scope.createWebhook = function() {
    if(!$scope.me || !$scope.me.uid) return;
    var url = location.origin + '/api/hook';
    url = url + '?entity=task&uid=' + $scope.me.uid + '&project=' + $scope.item._id;
    alert(url);
  };

  $scope.publishProject = function() {
    window.location = location.origin + '/projectPage/' + $scope.item.title.replace(/[^a-zA-Z ]/g, '') + '/' + $scope.item._id;
  };

  TasksService.getTemplate().then(function(template) {
    $scope.template = template;
  });

  $scope.openPolicyModal = function() {
    var modalInstance = $uibModal.open({
      animation: true,
      size: '40%',
      templateUrl: '/icu/components/project-policy/project-policy.html',
      controller: ProjectPolicyController,
      resolve: {
        item: function() {
          return $scope.item;
        },
        template: function() {
          return $scope.template;
        },
        me: function() {
          return $scope.me;
        },
        people: function() {
          return $scope.people;
        }
      }
    });

    modalInstance.result.then(function(result) {
      $scope.item.templates = result;
      ProjectsService.update($scope.item).then(function(project) {
        alert('saved');
        console.log(project);
      });
    });
  };

  $scope.menuItems = [{
    label: 'projectPolicy',
    fa: 'fa-list-ol',
    display: true,
    action: $scope.openPolicyModal,
  }, {
    label: 'publishProject',
    fa: 'fa-upload',
    display: true,
    action: $scope.publishProject,
  }, {
    label: 'createWebhook',
    fa: 'fa-plus-circle',
    display: true,
    action: $scope.createWebhook,
  }, {
    label: 'recycleProject',
    fa: 'fa-times-circle',
    display: !$scope.item.hasOwnProperty('recycled'),
    action: $scope.recycle
  }, {
    label: 'unrecycleProject',
    fa: 'fa-times-circle',
    display: $scope.item.hasOwnProperty('recycled'),
    action: $scope.recycleRestore,
  } ];

  // ==================================================== $watch: title / desc ==================================================== //

  $scope.$watch('item.title', function(nVal, oVal) {
    if (nVal !== oVal) {
      delayedUpdateTitle($scope.item, {
        name: 'title',
        oldVal: oVal,
        newVal: nVal,
        action: 'renamed'
      });
      ProjectsService.currentProjectName = $scope.item.title;
    }
  });

  $scope.$watch('item.description', function(nVal, oVal) {
    if (nVal !== oVal) {
      delayedUpdateDesc($scope.item, {
        name: 'description',
        oldVal: oVal,
        newVal: nVal,
        action: 'renamed'
      });
    }
  });

  // ==================================================== Update  ==================================================== //

  $scope.updateAndNotify = function(project) {
    project.status = $scope.statuses[1];

    if(context.entityName === 'discussion') {
      project.discussion = context.entityId;
    }

    if(project.assign === undefined || project.assign === null) {
      delete project['assign'];
    }
    else {
      // check the assignee is not a watcher already
      let filtered = project.watchers.filter(watcher=>{
        return watcher._id == project.assign;
      }
      );

      // add assignee as watcher
      if(filtered.length == 0) {
        project.watchers.push(project.assign);
      }
    }

    ProjectsService.update(project).then(function(result) {
      if(context.entityName === 'project') {
        var projId = result.project ? result.project._id : undefined;
        if(projId !== context.entityId) {
          $state.reload();
        }
      }

      ProjectsService.assign(project, me, backupEntity).then(function(res) {
        backupEntity = angular.copy(result);
        ActivitiesService.data.push(res);
      });
    });

  };

  function refreshList() {
    $rootScope.$broadcast('refreshList');
  }

  $scope.update = function(item, type) {
    if(type.name === 'color') {
      item.color = type.newVal;
    }
    ProjectsService.update(item, context).then(function(res) {
      if(ProjectsService.selected && res._id === ProjectsService.selected._id) {
        if(type === 'title') {
          ProjectsService.selected.title = res.title;
        }
      }
      switch (type.name) {
      case 'status':
        if(context.entityName === 'discussion') {
          item.discussion = context.entityId;
        }

        ProjectsService.updateStatus(item, $scope.me, backupEntity).then(function(result) {
          backupEntity = angular.copy($scope.item);
          ActivitiesService.data = ActivitiesService.data || [];
          ActivitiesService.data.push(result);
          refreshList();
        });
        break;
      case 'star':
        ProjectsService.updateStar(item, $scope.me, backupEntity).then(function(result) {
          backupEntity = angular.copy($scope.item);
          ActivitiesService.data = ActivitiesService.data || [];
          ActivitiesService.data.push(result);
        });
        break;
      case 'tags':
        ProjectsService.updateTags(item, $scope.me, backupEntity).then(function(result) {
          backupEntity = angular.copy($scope.item);
          ActivitiesService.data = ActivitiesService.data || [];
          ActivitiesService.data.push(result);
        });
        break;
      case 'title':
        ProjectsService.updateTitle(item, $scope.me, backupEntity).then(function(result) {
          backupEntity = angular.copy($scope.item);
          ActivitiesService.data = ActivitiesService.data || [];
          ActivitiesService.data.push(result);
          refreshList();
        });
        break;
      case 'description':
        ProjectsService.updateDescription(item, $scope.me, backupEntity).then(function(result) {
          backupEntity = angular.copy($scope.item);
          ActivitiesService.data = ActivitiesService.data || [];
          ActivitiesService.data.push(result);
          refreshList();
        });
        break;
      }
    });
  };

  var delayedUpdateTitle = _.debounce($scope.update, 2000);
  var delayedUpdateDesc = _.debounce($scope.update, 2000);

  // ==================================================== Buttons ==================================================== //

  $scope.updateStatusForApproval = function() {
    let context = {
      action: 'updated',
      name: 'status',
      type: 'project'
    };
    $scope.item.status = 'waiting-approval';
    $scope.update(entity, context);
  };

  // ==================================================== Template ==================================================== //

  $scope.saveTemplate = function(newTemplate) {
    return ProjectsService.saveTemplate($stateParams.id, newTemplate);
  };

  $scope.deleteTemplate = function(id) {
    return ProjectsService.deleteTemplate(id);
  };

  $scope.implementTemplate = function(id) {
    return ProjectsService.template2subProjects(id, {
      projectId: $stateParams.id
    }).then(function(result) {
      for(var i = result.length - 1; i >= 0; i--) {
        result[i].isNew = true;
      }
      $timeout(function() {
        for(var i = result.length - 1; i >= 0; i--) {
          result[i].isNew = false;
        }
      }, 5000);
      var tmp = $scope.item.subProjects.pop();
      $scope.item.subProjects = $scope.item.subProjects.concat(result);
      $scope.item.subProjects.push(tmp);
    });
  };
  // ==================================================== havePermissions ==================================================== //

  $scope.enableRecycled = true;
  $scope.isRecycled = $scope.item.hasOwnProperty('recycled');

  $scope.permsToSee = function() {
    return PermissionsService.haveAnyPerms($scope.item);
  };

  $scope.havePermissions = function(type, enableRecycled) {
    enableRecycled = enableRecycled || !$scope.isRecycled;
    return PermissionsService.havePermissions($scope.item, type) && enableRecycled;
  };

  $scope.haveEditiorsPermissions = function() {
    return PermissionsService.haveEditorsPerms($scope.item);
  };

}
