/// <reference path="../../shell.ts" />
/// <reference path="../../shared/abstract-controller.ts" />
/// <reference path="../services/dashboard-events.ts" />
/// <reference path="../services/dashboard-service.ts" />

module gogeo {

  class DashboardController extends AbstractController {
    static $inject = [
      "$scope",
      DashboardService.$named
    ];

    place: string;
    typeEstab: string;
    startDate: string = "05/21/2015";
    endDate: string = "05/30/2015";
    dateFormat: string = "MM/DD/YYYY";
    selected: any = ""
    citiesToSearch: Array<any> = Configuration.getPlacesToSearch();

    constructor($scope:     ng.IScope,
          public service: DashboardService) {
      super($scope);

      this.initialize();

      this.service.dateLimitObservable
        .subscribeAndApply(this.$scope, (result: any) => {
          if (result) {
            this.startDate = moment(new Date(result["max"])).subtract(15, "days").format("MM/DD/YYYY");
            this.endDate = moment(new Date(result["max"])).format("MM/DD/YYYY");
          }
        });

      this.service.loadParamsObservable
        .subscribeAndApply(this.$scope, (result: any) => {
          this.loadParams(result);
        });

      this.citiesToSearch = Configuration.getPlacesToSearch();
    }

    formatRangeValue(value) {
      return "R" + numeral(value).format('$ 0,0[.]00');
    };

    private loadParams(result: any) {
      if (!result || JSON.stringify(result) === JSON.stringify({})) {
        return;
      }

      var where = result["where"];
      if (where) {
        this.place = where;
        this.service.updatePlace(this.place);
      }

      var startDate = result["startDate"];
      var endDate = result["endDate"];
      if (startDate || endDate) {
        if (startDate) {
          this.startDate = startDate;
        }

        if (endDate) {
          this.endDate = endDate;
        }

        this.service.updateDateRange(new Date(Date.parse(this.startDate)), new Date(Date.parse(this.endDate)));
      }
    }

    initialize() {
      super.initialize();

      this.watchAsObservable<string>("place")
        .skip(1)
        .throttle(800)
        .subscribe(place => this.service.updatePlace(place));

      this.watchAsObservable<string>("typeEstab")
        .skip(1)
        .throttle(800)
        .subscribe(typeEstab => this.service.updateTypeEstab(typeEstab));

      Rx.Observable.merge(this.watchAsObservable<string>("startDate"), this.watchAsObservable<string>("endDate"))
        .skip(1)
        .throttle(400)
        .subscribe(range => {
          var startDate: Date = null;
          var endDate: Date = null;

          if (this.startDate) {
            startDate = new Date(Date.parse(this.startDate));
          }

          if (this.endDate) {
            endDate = new Date(Date.parse(this.endDate));
          }

          this.service.updateDateRange(startDate, endDate);
        });
    }
  }

  registerDirective("dashboardHeader", () => {
    return {
      restrict: "C",
      templateUrl: "dashboard/controls/dashboard-header-template.html",
      controller: DashboardController,
      controllerAs: "header",
      bindToController: true,
      scope: true
    };
  });

}