"use strict";

angular
  .module("mean.icu.ui.officedetails", [])
  .controller("OfficeDetailsController", OfficeDetailsController);

function OfficeDetailsController(
  $rootScope,
  $scope,
  entity,
  tasks,
  folders,
  people,
  offices,
  context,
  $state,
  EntityService,
  OfficesService,
  PermissionsService,
  $stateParams,
  ActivitiesService,
  $window,
  DetailsPaneService
) {
  // ==================================================== init ==================================================== //

  $scope.tabs = DetailsPaneService.orderTabs([
    "activities",
    "documents",
    "folders",
    "signatures"
  ]);

  let currentState = $state.current.name;

  if (
    $state.$current.url.source.includes("search") ||
    $state.$current.url.source.includes("offices")
  ) {
    $scope.item = entity || context.entity;
  } else {
    $scope.item = context.entity || entity;
  }

  if (!$scope.item) {
    $state.go("main.offices.byentity", {
      entity: context.entityName,
      entityId: context.entityId
    });
  } else if (
    $scope.item &&
    ($state.current.name === "main.offices.all.details" ||
      $state.current.name === "main.search.office" ||
      $state.current.name === "main.offices.byentity.details")
  ) {
    $state.go("." + window.config.defaultTab);
  }

  $scope.editorOptions = {
    theme: "bootstrap",
    buttons: [
      "bold",
      "italic",
      "underline",
      "anchor",
      "quote",
      "orderedlist",
      "unorderedlist"
    ]
  };
  $scope.statuses = ["new", "in-progress", "canceled", "done", "archived"];

  $scope.entity = entity || context.entity;
  $scope.tasks = tasks.data || tasks;
  $scope.folders = folders.data || folders;
  $scope.items = offices.data || offices;

  // backup for previous changes - for updates
  var backupEntity = angular.copy($scope.item);

  $scope.people = people.data || people;

  OfficesService.getStarred().then(function(starred) {
    $scope.item.star = _(starred).any(function(s) {
      return s._id === $scope.item._id;
    });
  });

  // ==================================================== onChanges ==================================================== //

  $scope.onStar = function(value) {
    $scope.update($scope.item, {
      name: "star"
    });

    OfficesService.star($scope.item).then(function() {
      $state.reload();
    });
  };

  $scope.onColor = function(value) {
    $scope.update($scope.item, value);
  };

  $scope.onWantToCreateRoom = function() {
    $scope.item.WantRoom = true;

    $scope.update($scope.item, context);

    OfficesService.WantToCreateRoom($scope.item).then(function(data) {
      $state.reload();
      if (data.roomName) {
        $window.open(window.config.rocketChat.uri + "/group/" + data.roomName);
        return true;
      } else {
        return false;
      }
    });
  };

  // ==================================================== Menu events ==================================================== //

  $scope.recycle = function() {
    EntityService.recycle("offices", $scope.item._id).then(function() {
      $scope.item.recycled = new Date();
      let clonedEntity = angular.copy($scope.item);
      clonedEntity.status = "Recycled";
      OfficesService.updateStatus(clonedEntity, $scope.item).then(function(
        result
      ) {
        ActivitiesService.data.push(result);
      });
      refreshList();
      $state.go('^.^');
      $scope.isRecycled = $scope.item.hasOwnProperty('recycled');
      $scope.permsToSee();
      $scope.havePermissions();
      $scope.haveEditiorsPermissions();
    });
  };

  $scope.recycleRestore = function() {
    EntityService.recycleRestore("offices", $scope.item._id).then(function() {
      let clonedEntity = angular.copy($scope.item);
      clonedEntity.status = "un-deleted";
      refreshList();
      $state.go('^.^');
    });
  };

  function refreshList() {
    $rootScope.$broadcast("refreshList");
  }

  $scope.menuItems = [
    {
      label: "deleteOffice",
      fa: "fa-times-circle",
      display: !$scope.item.hasOwnProperty("recycled"),
      action: $scope.recycle
    },
    {
      label: "unrecycleProject",
      fa: "fa-times-circle",
      display: $scope.item.hasOwnProperty("recycled"),
      action: $scope.recycleRestore
    },
    {
      label: "Say Hi!",
      icon: "chat",
      display: true,
      action: $scope.onWantToCreateRoom
    }
  ];

  // ==================================================== $watch: title / desc ==================================================== //

  $scope.$watch('item.title', function(nVal, oVal) {
    if (nVal !== oVal) {
      delayedUpdateTitle($scope.item, {
        name: 'title',
        oldVal: oVal,
        newVal: nVal,
        action: 'renamed'
      });
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

  $scope.$watch('item.tel', function(nVal, oVal) {
    if (nVal !== oVal) {
      delayedUpdateTel($scope.item, {
        name: 'tel',
        oldVal: oVal,
        newVal: nVal,
        action: 'changed'
      });
    }
  });

  $scope.$watch('item.internalTel', function(nVal, oVal) {
    if (nVal !== oVal) {
      delayedUpdateInternalTel($scope.item, {
        name: 'internalTel',
        oldVal: oVal,
        newVal: nVal,
        action: 'changed'
      });
    }
  });

  $scope.$watch('item.unit', function(nVal, oVal) {
    if (nVal !== oVal) {
      delayedUpdateUnit($scope.item, {
        name: 'unit',
        oldVal: oVal,
        newVal: nVal,
        action: 'changed'
      });
    }
  });

  // ==================================================== Update ==================================================== //

  $scope.update = function(office, context) {
    let me = $scope.me;
    if (context.name === "color") {
      office.color = context.newVal;
    }
    OfficesService.update(office, context).then(function(res) {
      if (OfficesService.selected && res._id === OfficesService.selected._id) {
        if (context.name === "title") {
          OfficesService.selected.title = res.title;
        }
      }
      switch (context.name) {
        case "title":
          OfficesService.updateTitle(office, me, backupEntity).then(function(
            result
          ) {
            backupEntity = angular.copy($scope.item);
            ActivitiesService.data = ActivitiesService.data || [];
            ActivitiesService.data.push(result);
          });
          break;
        case "star":
          OfficesService.updateStar(office, me, backupEntity).then(function(
            result
          ) {
            backupEntity = angular.copy($scope.item);
            ActivitiesService.data = ActivitiesService.data || [];
            ActivitiesService.data.push(result);
          });
          break;
        case "description":
          OfficesService.updateDescription(office, me, backupEntity).then(
            function(result) {
              backupEntity = angular.copy($scope.item);
              ActivitiesService.data = ActivitiesService.data || [];
              ActivitiesService.data.push(result);
            }
          );
          break;
        case "tel":
        case "unit":
          OfficesService.updateTitle(office, me, backupEntity).then(function(
            result
          ) {
            backupEntity = angular.copy($scope.item);
          });
          break;
      }
    });
  };

  $scope.updateCurrentOffice = function() {
    OfficesService.currentOfficeName = $scope.item.title;
  };

  var delayedUpdateTitle = _.debounce($scope.update, 2000);
  var delayedUpdateDesc = _.debounce($scope.update, 2000);
  var delayedUpdateTel = _.debounce($scope.update, 2000);
  var delayedUpdateInternalTel = _.debounce($scope.update, 2000);
  var delayedUpdateUnit = _.debounce($scope.update, 2000);

  // ==================================================== havePermissions ==================================================== //

  $scope.enableRecycled = true;
  $scope.havePermissions = function(type, enableRecycled) {
    enableRecycled = enableRecycled || !$scope.isRecycled;
    return PermissionsService.havePermissions(entity, type) && enableRecycled;
  };

  $scope.haveEditiorsPermissions = function() {
    return PermissionsService.haveEditorsPerms($scope.entity);
  };

  $scope.permsToSee = function() {
    return PermissionsService.haveAnyPerms($scope.entity);
  };
}
