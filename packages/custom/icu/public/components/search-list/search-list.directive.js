'use strict';

angular.module('mean.icu.ui.searchlistdirective', [])
.directive('icuSearchList', function (LayoutService) {
    function controller($rootScope, $scope, $state, $filter, SearchService, MultipleSelectService, NotifyingService) {

        if ($scope.results.length && $state.current.name === 'main.search') {
            var active  = $scope.results[0];

           // $state.go('.' + active._type, { id: active._id } );
        }
        $scope.rowClicked = function(result) {
            LayoutService.clicked();
            if($scope.multipleSelectMode) return;
            $state.go(`main.search.${result.type || result._type}.${window.config.defaultTab}`, {
                id: result.entityId ? result.entityId : result.id
            })
        };


        for(var i = 0; i < $scope.results.length; i++){
            $scope.results[i]._id = $scope.results[i].id = $scope.results[i].id || $scope.results[i]._id;
        }

        //********Multiple Select Search*******//
        $scope.mouseOnMultiple = false;
        $scope.selectedItems = MultipleSelectService.refreshSelectedList();
        $scope.cornerState = MultipleSelectService.getCornerState();
        NotifyingService.notify('multipleDisableDetailsPaneCheck');

        $scope.showTick = function(item){ item.visible = true };
        $scope.hideTick = function(item){ item.visible = false };

        $scope.multipleSelectRefreshSelected = function (entity) {

            event.stopPropagation(); // Prevent $scope.onClickRow from navigating to entity details
            $state.go('main.search');

            MultipleSelectService.refreshSelectedList(entity);
            multipleSelectRefreshState();
        };

        function multipleSelectRefreshState(){
            let filteredResults = filterResults($scope.results);

            $scope.selectedItems = MultipleSelectService.getSelected();
            refreshActiveItemsInList();
            $scope.cornerState = MultipleSelectService.refreshCornerState(filteredResults.length);

            if ($scope.selectedItems.length) {
                $scope.multipleSelectMode = true;
            } else {
                MultipleSelectService.refreshSelectedList();
            }

            multipleDisablingCheck();
            $rootScope.$broadcast('refreshBulkButtonsAccess');
            NotifyingService.notify('multipleDisableDetailsPaneCheck');
        }

        function refreshActiveItemsInList(){
            let filteredResults = filterResults($scope.results);
            $scope.selectedItems = MultipleSelectService.getSelected();

            for(let filteredResult of filteredResults){
                let entity = $scope.selectedItems.find( selected => selected._id === filteredResult._id );
                filteredResult.selected = !!entity;
            }
        }

        function multipleDisablingCheck(){
            if(!$scope.selectedItems.length && !$scope.mouseOnMultiple){
                $scope.multipleSelectMode = false;
                $scope.changeMultipleMode();
            }
        }
        $scope.changeMultipleMode = () => $scope.$broadcast('checkMultipleMode');
        $scope.$on('changeCornerState', (event, cornerState) => multipleSelectSetAllSelected(cornerState === 'all'));

        NotifyingService.subscribe('refreshAfterOperation', () => {
            MultipleSelectService.refreshSelectedList();
            MultipleSelectService.refreshCornerState(0);
            refreshActiveItemsInList();
            multipleSelectRefreshState();
        }, $scope);

        function multipleSelectSetAllSelected(status){
            let filteredResults = filterResults($scope.results);
            for(let i = 0; i < filteredResults.length; i++){
                let rowSelectStatus = filteredResults[i];

                if(!rowSelectStatus.selected)MultipleSelectService.refreshSelectedList(filteredResults[i]);
                rowSelectStatus.selected = status;
            }
            if(status){
                let copy = _.map(filteredResults, _.clone);
                MultipleSelectService.setSelectedList(copy);
            } else {
                MultipleSelectService.refreshSelectedList();
            }
            multipleSelectRefreshState();
        }

        NotifyingService.subscribe('refreshAfterAllOperations', () => {
            $scope.$broadcast('refreshBulkButtonsAccess');
            NotifyingService.notify('multipleDisableDetailsPaneCheck');
        }, $scope);

        function filterResults(itemsArray){
            return $filter('filteringByUpdated')(itemsArray);
        }
    }

    return {
        restrict: 'A',
        templateUrl: '/icu/components/search-list/search-list.directive.html',
        scope: {
            results: '=',
            multipleSelectMode: '=',
            changeMultipleMode: '='
        },
        controller: controller
    };
});
