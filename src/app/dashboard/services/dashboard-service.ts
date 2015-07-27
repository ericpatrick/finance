///<reference path="../../shell.ts" />
///<reference path="../../shared/controls/queries.ts"/>
///<reference path="../../shared/controls/dashboard-query.ts"/>
///<reference path="../../shared/controls/gogeo-geosearch.ts"/>
///<reference path="../../shared/controls/gogeo-geoagg.ts"/>

/**
 * Created by danfma on 07/03/15.
 */

module gogeo {
  export interface TotalTweets {
    count: number;
  }

  export class DashboardService {
    static $named = "dashboardService";
    static $inject = [
      "$q",
      "$http",
      "$location",
      "$timeout",
      "$routeParams"
    ];

    private _lastGeomSpace:IGeomSpace = null;
    private _lastPlaceString: string = null;
    private _lastDateRange: IDateRange = null;
    private _lastMapCenter: L.LatLng = null;
    private _lastMapZoom: number = 0;
    private _lastMapType: string = null;
    private _lastMapBase: string = null;
    private _lastTypeEstab: string = null;
    private _loading: boolean = true;

    private worldBound: IGeom = {
      type: "Polygon",
      coordinates: [
        [
        [
          -201.09375,
          -81.97243132048264
        ],
        [
          -201.09375,
          84.86578186731522
        ],
        [
          201.09375,
          84.86578186731522
        ],
        [
          201.09375,
          -81.97243132048264
        ],
        [
          -201.09375,
          -81.97243132048264
        ]
        ]
      ]
    };

    _geomSpaceObservable = new Rx.BehaviorSubject<IGeomSpace>(null);
    _placeObservable = new Rx.BehaviorSubject<string>(null);
    _hashtagResultObservable = new Rx.BehaviorSubject<IHashtagResult>(null);
    _dateRangeObservable = new Rx.BehaviorSubject<IDateRange>(null);
    _lastQueryObservable = new Rx.BehaviorSubject<any>(null);
    _tweetObservable = new Rx.BehaviorSubject<Array<ITransaction>>(null);
    _dateLimitObservable = new Rx.BehaviorSubject<any>(null);
    _placeBoundObservable = new Rx.BehaviorSubject<L.LatLng>(null);
    _loadParamsObservable = new Rx.BehaviorSubject<any>(null);
    _lastTypeEstabObservable = new Rx.BehaviorSubject<string>(null);

    constructor(private $q:       ng.IQService,
          private $http:      ng.IHttpService,
          private $location:    ng.ILocationService,
          private $timeout:     ng.ITimeoutService,
          private $routeParams:   ng.route.IRouteParamsService) {

      this.initialize();
      // this.getDateRange();
      this.loadParams();
    }

    private loadParams() {
      this._loadParamsObservable.onNext(this.$routeParams);

      this.$timeout(() => {
        this.$location.search({});
      }, 200);
    }

    get loading(): boolean {
      return this._loading;
    }

    public isLoading(): boolean {
      return this._loading;
    }

    get geomSpaceObservable():Rx.Observable<IGeomSpace> {
      return this._geomSpaceObservable;
    }

    get hashtagResultObservable():Rx.Observable<IHashtagResult> {
      return this._hashtagResultObservable;
    }

    get queryObservable():Rx.Observable<any> {
      return this._lastQueryObservable;
    }

    get dateRangeObsersable():Rx.Observable<IDateRange> {
      return this._dateRangeObservable;
    }

    get placeObservable():Rx.BehaviorSubject<string> {
      return this._placeObservable;
    }

    get tweetObservable():Rx.BehaviorSubject<Array<ITransaction>> {
      return this._tweetObservable;
    }

    get dateLimitObservable():Rx.BehaviorSubject<any> {
      return this._dateLimitObservable;
    }

    get placeBoundObservable():Rx.BehaviorSubject<L.LatLng> {
      return this._placeBoundObservable;
    }

    get loadParamsObservable():Rx.BehaviorSubject<any> {
      return this._loadParamsObservable;
    }

    get lastTypeEstabObservable():Rx.BehaviorSubject<string> {
      return this._lastTypeEstabObservable;
    }

    initialize() {
      Rx.Observable
        .merge<any>(this._geomSpaceObservable, this._dateRangeObservable)
        .throttle(400)
        .subscribe(() => this.search());

      Rx.Observable
        .merge<any>(this._placeObservable, this._lastTypeEstabObservable)
        .throttle(800)
        .subscribe(() => this.search());
    }

    private getBoundOfPlace(placeString: string) {
      if (placeString) {
        var place = placeString["originalObject"];
        var lat = place["lat"];
        var lon = place["long"];

        var points = L.latLng(lat, lon);
        this._placeBoundObservable.onNext(points);

        // this._lastPlaceCode = country_code;
        this._lastPlaceString = place["city"];
        this._placeObservable.onNext(this._lastPlaceString);
      } else {
          // this._lastPlaceCode = null;
          this._lastPlaceString = null;
          // this._placeObservable.onNext(this._lastPlaceCode);
          this._placeObservable.onNext(this._lastPlaceString);
      }
    }

    private calculateNeSW(bounds: L.LatLngBounds) {
      var ne = new L.LatLng(bounds.getNorthEast().lng, bounds.getNorthEast().lat);
      var sw = new L.LatLng(bounds.getSouthWest().lng, bounds.getSouthWest().lat);

      return new NeSwPoint(ne, sw);
    }

    private pointToGeoJson(point: NeSwPoint): IGeomSpace {
      var ne = [point.ne.lat, point.ne.lng];
      var sw = [point.sw.lat, point.sw.lng];

      var nw = [sw[0], ne[1]];
      var se = [ne[0], sw[1]];

      var coordinates = [
        [
          sw, nw, ne, se, sw
        ]
      ];

      return {
        source: "mapBounds",
        type: "Polygon",
        coordinates: coordinates
      }
    }

    updateGeomSpace(geom: IGeomSpace) {
      this._loading = true;
      this._lastGeomSpace = geom;
      this._geomSpaceObservable.onNext(geom);
    }

    updateGeomSpaceByBounds(bounds: L.LatLngBounds) {
      var point = this.calculateNeSW(bounds);
      var geomSpace = this.pointToGeoJson(point);

      if (geomSpace) {
        this.updateGeomSpace(geomSpace);
      }
    }

    // updatePlace(place: string) {
    //   console.log("---------------");
    //   if (place) {
    //     this._lastPlaceString = place;
    //   } else {
    //     this._lastPlaceString = null;
    //   }

    //   this._placeObservable.onNext(this._lastPlaceString);
    // }

    updatePlace(place: string) {
        this.getBoundOfPlace(place);
    }

    updateTypeEstab(typeEstab: string) {
        if(typeEstab) {
          this._lastTypeEstab = typeEstab;
        } else {
          this._lastTypeEstab = null;
        }

        this._placeObservable.onNext(this._lastTypeEstab);
    }

    updateDateRange(startDate: Date, endDate: Date) {
      var dateRange: IDateRange = null;

      if (startDate || endDate) {
        dateRange = { start: startDate, end: endDate };
      }

      this._lastDateRange = dateRange;
      this._dateRangeObservable.onNext(dateRange);
    }

    updateMapCenter(mapCenter: L.LatLng) {
      this._lastMapCenter = mapCenter;
    }

    updateMapZoom(mapZoom: number) {
      this._lastMapZoom = mapZoom;
    }

    updateMapType(mapType: string) {
      this._lastMapType = mapType;
    }

    updateMapBase(mapBase: string) {
      this._lastMapBase = mapBase;
    }

    getTransaction(latlng: L.LatLng, zoom: number, thematicQuery?: ThematicQuery) {
      return this.getTransactionData(latlng, zoom, thematicQuery);
    }

    getDateRange() {
      if (!this.$location.search()["startDate"] && !this.$location.search()["endDate"]) {
        this.$http.get(Configuration.getDateRangeUrl()).then((result: any) => {
          this._dateLimitObservable.onNext(result.data);
        });
      }
    }

    getStatsAggregationTypeEstab() {
      var field = Configuration.getAggChartField();
      var groupBy = Configuration.getTypeEstabGroupBy();

      return this.getStatsAggregation(field, groupBy)
    }

    getStatsAggregation(field: string, groupBy: string) {
      var url = Configuration.makeUrl("aggregations/" + Configuration.getDatabaseName() + "/" + Configuration.getCollectionName() + "/stats");
      var q = this.composeQuery().requestData.q;

      var queryGeom = {
        type: "Polygon",
        coordinates: this._lastGeomSpace.coordinates
      };

      // console.log("->", JSON.stringify(q, null, 2));

      var options = {
        params: {
          mapkey: Configuration.getMapKey(),
          field: field,
          group_by: groupBy,
          q: JSON.stringify(q),
          geom: JSON.stringify(queryGeom)
        }
      };

      return this.$http.get<Array<IStatsSumAgg>>(url, options);
    }

    private getTransactionData(latlng: L.LatLng, zoom: number, thematicQuery?: ThematicQuery) {
      var url = Configuration.makeUrl("geosearch/" + Configuration.getDatabaseName() + "/" + Configuration.getCollectionName() + "?mapkey=123");
      var pixelDist = 2575 * Math.cos((latlng.lat * Math.PI / 180)) / Math.pow(2, (zoom + 8));
      var query = this.composeQuery().requestData.q;

      if (thematicQuery) {
        query = thematicQuery.build();
      }

      var geom = <IGeom>{
        type: "Point",
        coordinates: [
          latlng.lng, latlng.lat
        ]
      };

      var geosearch = new GogeoGeosearch(this.$http, geom, pixelDist, "degree", Configuration.tweetFields(), 1, query);
      geosearch.execute((result: Array<ITransaction>) => {
        this._tweetObservable.onNext(result);
      });
    }

    totalTweets() {
      var url = Configuration.getTotalTweetsUrl();
      return this.$http.get(url);
    }

    search() {
      if (!this._lastGeomSpace) {
        return;
      }

      this._loading = true;

      var query = this.composeQuery();

      query.execute(
        (result) => {
          this._loading = false;
          this._hashtagResultObservable.onNext(result);
        }
      );

      this._lastQueryObservable.onNext(query.requestData.q);
    }

    composeQuery(): DashboardQuery {
      var query = new DashboardQuery(this.$http, this._lastGeomSpace);

      if (this._lastPlaceString) {
        query.filterByPlace(this._lastPlaceString);
      }

      if (this._lastDateRange) {
        query.filterByDateRange(this._lastDateRange);
      }

      if (this._lastTypeEstab) {
        query.filterByTypeEstab(this._lastTypeEstab);
      }

      return query;
    }
  }

  registerService(DashboardService);

}
