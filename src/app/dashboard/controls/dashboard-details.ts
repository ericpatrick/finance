/// <reference path="../../shell.ts" />
/// <reference path="../services/dashboard-events.ts" />
/// <reference path="../services/dashboard-service.ts" />

module gogeo {

    class DashboardDetailsController {
        static $inject = [
            "$scope",
            "$interval",
            "$filter",
            DashboardService.$named
        ];

        constructor(private $scope: ng.IScope,
                    private $interval: ng.IIntervalService,
                    private $filter: ng.IFilterService,
                    private service: DashboardService) {
        }

        initialize() {
        }
    }

    registerDirective("dashboardDetails", () => {
        return {
            restrict: "CE",
            templateUrl: "dashboard/controls/dashboard-details-template.html",
            controller: DashboardDetailsController,
            controllerAs: "details",
            bindToController: true,
            scope: true,

            link(scope, element, attrs, controller:DashboardDetailsController) {
                controller.initialize();
            }
        };
    });
}