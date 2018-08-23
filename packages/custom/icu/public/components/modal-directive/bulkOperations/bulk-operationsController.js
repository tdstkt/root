function bulkOperationsController($scope, context, $stateParams, $state, $i18next, $uibModalInstance, $timeout, activityType, entityName,
                                  MultipleSelectService, UsersService, SettingServices, PermissionsService, NotifyingService) {

    $scope.selectedItems = MultipleSelectService.getSelected();
    $scope.selected = {};
    $scope.activityType = activityType;
    $scope.entityName = entityName;
    UsersService.getAll().then(allUsers => {
        $scope.people = allUsers;
        $scope.getUsedWatchers();
    });
    UsersService.getMe().then( me => $scope.me = me);


  $scope.statusMap = SettingServices.getStatusList();
    $scope.statuses = $scope.statusMap[$scope.entityName.substring(0, $scope.entityName.length - 1)];

    $scope.select = function (selected) {
        $scope.selected = selected;
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.bulkUpdate = function (type, value) {
        if(!value)return;

        let idsArray = $scope.selectedItems.map(entity => entity._id);
        let changedBulkObject = {
            update: {},
            ids: idsArray
        };
        changedBulkObject.update[type] = value;

        MultipleSelectService.bulkUpdate(changedBulkObject, $scope.entityName)
            .then(result => {
                for(let i = 0; i < $scope.selectedItems.length; i++){
                    let entity = result.find(entity => entity._id === $scope.selectedItems[i]._id);
                    if(typeof entity.due === 'string')entity.due = new Date(entity.due);
                    entity = _.pick(entity, ['status', 'watchers', 'assign', 'due', 'tags', 'recycled']);
                    Object.assign($scope.selectedItems[i], entity);
                }
                if(changedBulkObject.update.delete){
                    refreshState();
                }
                MultipleSelectService.setSelectedList($scope.selectedItems);
                NotifyingService.notify('refreshAfterOperation');
                $uibModalInstance.dismiss('cancel');
            });
    };

    $scope.updateComplex = function(){
        let updateObject = $scope.selectedWatchers.filter( bulkObject => !bulkObject.remove);
        let updateIds = updateObject.map( bulkObject => bulkObject._id);
        let updatePermissions = updateObject.map( bulkObject => {
            return {
                'id': bulkObject._id,
                'permissions': bulkObject.permissions
            }
        });

        let removeObject = $scope.selectedWatchers.filter( bulkObject => bulkObject.remove);
        let removedIds = removeObject.map( bulkObject => bulkObject._id);

        let idsArray = $scope.selectedItems.map(entity => entity._id);
        let changedBulkObject = {
            ids: idsArray
        };

        if(updateIds.length){
            changedBulkObject.update = {};
            changedBulkObject.update.watchers = updateIds;
            changedBulkObject.update.permissions = updatePermissions;
        }
        if(removeObject.length){
            changedBulkObject.remove = {};
            changedBulkObject.remove.watchers = removedIds;
        }

        MultipleSelectService.bulkUpdate(changedBulkObject, $scope.entityName)
            .then(result => {
                for(let i = 0; i < $scope.selectedItems.length; i++){
                    let entity = result.find(entity => entity._id === $scope.selectedItems[i]._id);
                    if(typeof entity.due === 'string')entity.due = new Date(entity.due);
                    entity = _.pick(entity, ['status', 'watchers', 'assign', 'due', 'tags', 'recycled']);
                    Object.assign($scope.selectedItems[i], entity);
                }
                if(changedBulkObject.update.delete){
                    refreshState();
                }
                MultipleSelectService.setSelectedList($scope.selectedItems);
                NotifyingService.notify('refreshAfterOperation');
                $uibModalInstance.dismiss('cancel');
                $state.reload();
            });
    };

    function refreshState(){
        let currentState = $state.current.name;
        $state.go(currentState, {
            entity: 'all',
        }, {
            reload: true
        });
    }

    //--------------------------------------------------//
    //----------------------watchers----------------------//

    $scope.usedWatchers = [];
    $scope.unusedWatchers = [];
    $scope.selectedWatchers = {};

    $scope.getUsedWatchers = function(){
        let usedIds = getIdsArray($scope.selectedItems[0].watchers);

        for(let selectedItem of $scope.selectedItems){
            usedIds = _.intersection(getIdsArray(selectedItem.watchers), usedIds)
        }

        $scope.usedWatchers = usedIds.map( id => _.find($scope.people, { '_id': id}));
        $scope.getUnusedWatchers();
        $scope.transformToBulkObjects($scope.usedWatchers);
    };

    $scope.getUnusedWatchers = function(){
        let unUsedIds = _.difference(getIdsArray($scope.people), getIdsArray($scope.usedWatchers));
        $scope.unusedWatchers = unUsedIds.map( id =>  _.find($scope.people, { '_id': id}));
    };

    $scope.transformToBulkObjects = function(array){
        $scope.selectedWatchers = array.map( object =>  createBulkWatcher(object._id, $scope.userPermissionStatus(object), false, true));
    };

    function createBulkWatcher(id, perms, remove, primary){
        return {
            '_id': id,
            'permissions': perms,
            'remove': remove,
            'primary': primary
        }
    }

    function getIdsArray(objArray){
        return objArray.map(obj => obj._id);
    }

    $scope.userPermissionStatus = function(member){
        if(member) return PermissionsService.getUnifiedPerms(member, $scope.selectedItems);
        return 'No Permissions';
    };

    function changePerms(member, newPerms){
        let bulkWatcher = $scope.selectedWatchers.find( watcher => watcher._id === member._id);
        bulkWatcher.permissions = newPerms;
    }

    $scope.setEditor = function(user){return changePerms(user, 'editor')};
    $scope.setCommenter = function(user){return changePerms(user, 'commenter');};
    $scope.setViewer = function(user){return changePerms(user, 'viewer')};

    $scope.addMember = function(member){
        $scope.usedWatchers.push(member);

        let bulkWatcher = createBulkWatcher(member._id,  $scope.userPermissionStatus(member), false, false);
        $scope.selectedWatchers.push(bulkWatcher);
    };

    $scope.removeMember = function(member){
        $scope.usedWatchers = _.reject($scope.usedWatchers,  {'_id': member._id});

        let bulkWatcher = $scope.selectedWatchers.find( watcher => watcher._id === member._id);
        if(bulkWatcher.primary){
            bulkWatcher.remove = true;
        } else {
            $scope.selectedWatchers = _.reject($scope.selectedWatchers,  {'_id': member._id});
        }
    };

    $scope.selfTest = function(member){
        member.selfTest = $scope.me._id === member._id;
        return member;
    };

    $scope.triggerSelect = function() {
        $scope.showSelect = !$scope.showSelect;
        if ($scope.showSelect) {
            $scope.animate = false;
        }
    };

    //------------------------------------------------//
    //----------------------DUE----------------------//

    $scope.selectedDue = {};
    $scope.setDueDate = 'setDueDate';
    $scope.dueDateErrorMessage = 'couldNotSetPreviousTime';
    $scope.duePlaceholder = $scope.setDueDate;

    $scope.dueOptions = {
        dateFormat: 'dd.mm.yy'
    };

    $scope.dateCheck = function(){
        let nowTime = new Date();
        if($scope.selectedDue.date < nowTime){
            $scope.duePlaceholder = $scope.dueDateErrorMessage;
            $scope.selectedDue.date = '';
        } else {
            $scope.bulkUpdate('due', $scope.selectedDue.date);
        }
    };

  //------------------------------------------------//
  //----------------------TAGS----------------------//

  $scope.usedTags = [];
  $scope.removedTags = [];
  $scope.tags = [];

  getUsedTags();
  function getUsedTags(){
    let usedTags = $scope.selectedItems[0].tags;

    for(let selectedItem of $scope.selectedItems){
      usedTags = _.intersection(selectedItem.tags, usedTags)
    }

    $scope.usedTags = usedTags.map( tag => tagsToBulkObjects(tag, false, true))
  }

  function tagsToBulkObjects(tag, remove, primary){
    return {
      'tag': tag,
      'primary': primary,
      'remove': remove
    }
  }

  $scope.addTagClicked = function () {
      $scope.tagInputVisible = true;
      $timeout(function () {
          let element = angular.element('#addTag .ui-select-toggle')[0];
          element.click();
      }, 0);
  };

    $scope.addTag = function (tag) {
      $scope.usedTags.push(tagsToBulkObjects(tag, false, false));

      $scope.tagInputVisible = false;
  };

  $scope.removeTag = function (tag) {
    let bulkTag = $scope.usedTags.find( obj => obj.tag === obj);

    if(bulkTag.primary){
      bulkTag.remove = true;
    } else {
      $scope.usedTags = _.reject($scope.usedTags,  {'tag': tag});
    }
  };

  $scope.tagUpdate = function(){
    let updateObject = $scope.usedTags.filter( bulkObject => !bulkObject.remove);
    let updateIds = updateObject.map( bulkObject => bulkObject.tag);

    let removeObject = $scope.usedTags.filter( bulkObject => bulkObject.remove);
    let removedIds = removeObject.map( bulkObject => bulkObject.tag);

    let idsArray = $scope.selectedItems.map(entity => entity._id);
    let changedBulkObject = {
      ids: idsArray
    };

    if(updateIds.length){
      changedBulkObject.update = {};
      changedBulkObject.update.tags = updateIds;
    }
    if(removeObject.length){
      changedBulkObject.remove = {};
      changedBulkObject.remove.tags = removedIds;
    }

    MultipleSelectService.bulkUpdate(changedBulkObject, $scope.entityName)
      .then(result => {
        for(let i = 0; i < $scope.selectedItems.length; i++){
          let entity = result.find(entity => entity._id === $scope.selectedItems[i]._id);
          if(typeof entity.due === 'string')entity.due = new Date(entity.due);
          entity = _.pick(entity, ['status', 'watchers', 'assign', 'due', 'tags', 'recycled']);
          Object.assign($scope.selectedItems[i], entity);
        }
        if(changedBulkObject.update.delete){
          refreshState();
        }
        MultipleSelectService.setSelectedList($scope.selectedItems);
        NotifyingService.notify('refreshAfterOperation');
        $uibModalInstance.dismiss('cancel');
        $state.reload();
      });
  }

  $scope.onOpenClose = function (isOpen) {
      $scope.tagInputVisible = !isOpen;
  };

  switch (activityType) {
      case 'status':
          $scope.title = `${$i18next('setStatus')}`;
          break;
      case 'watchers':
          $scope.title = `${$i18next('setWatchers')}`;
          break;
      case 'assign':
          $scope.title = `${$i18next('assign')}`;
          break;
      case 'due':
          $scope.title = `${$i18next('setDueDate')}`;
          break;
      case 'tag':
          $scope.title = `${$i18next('addTags')}`;
          break;
      case 'delete':
          $scope.title = `${$i18next('delete')}`;
          break;
  }
}
