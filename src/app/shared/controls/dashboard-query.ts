module gogeo {
  export class DashboardQuery {
    requestData: any = {};

    constructor(private $http: ng.IHttpService, geomSpace: IGeomSpace) {
      this.requestData = {
        agg_size: Configuration.getAggSize(),
        field: Configuration.getAggField(),
        geom: geomSpace,
        q: {
          query: {
            bool: {
              must: []
            }
          }
        }
      };
    }

    getOrCreateAndRestriction(filter: any) {
      // var and = filter["and"];

      // if (!and) {
      //   and = filter.and = {
      //     filters: []
      //   };
      // }

      // return and;
    }

    filterByHashtag(hashtag: IBucket) {
      // var filter:any = this.requestData.q.query.filtered.filter;

      // if (hashtag) {
      //   this.requestData["field"] = "place.full_name.raw";
      //   this.requestData["agg_size"] = 5;

      //   var and = this.getOrCreateAndRestriction(filter);
      //   var queryString = new TextQueryBuilder(TextQueryBuilder.HashtagText, hashtag.key);

      //   and.filters.push(queryString.build());
      // }
    }

    filterByUsername(username: string) {
      // var filter:any = this.requestData.q.query.filtered.filter;
      // var and = this.getOrCreateAndRestriction(filter);
      // var queryString = new TextQueryBuilder(TextQueryBuilder.UserScreenName, username + "*");

      // and.filters.push(queryString.build());
    }

    filterByText(text: string) {
      // var filter:any = this.requestData.q.query.filtered.filter;
      // var and = this.getOrCreateAndRestriction(filter);
      // var queryString = new TextQueryBuilder(TextQueryBuilder.Text, text);

      // and.filters.push(queryString.build());
    }

    filterByPlace(text: string) {
      this.filterByField(text, "city")
    }

    filterByTypeEstab(text: string) {
      this.filterByField(text, "typeestab");
    }

    filterByDateRange(range: IDateRange) {
      var must = this.getMust();

      var dateRangeQuery = new DateRangeQueryBuilder(DateRangeQueryBuilder.DateRange, range);
      must.push(dateRangeQuery.build());
    }

    filterByValueRange(range: IValueRange) {
      var must = this.getMust();

      var valueRangeQuery = new ValueRangeQueryBuilder(ValueRangeQueryBuilder.ValueRange, range);
      must.push(valueRangeQuery.build());
    }

    filterByField(text: string, field: string) {
      var must = this.getMust();

      var placeQueryString = new MatchPhraseQuery(text, field);
      must.push(placeQueryString.build());
    }

    getMust() {
      return this.requestData.q.query.bool.must;
    }

    execute(resultHandler:(IHashtagResult) => void) {
      var url = Configuration.makeUrl("geoagg/" + Configuration.getDatabaseName() + "/" + Configuration.getCollectionName() + "?mapkey=123");

      // console.log("this.requestData", JSON.stringify(this.requestData, null, 2));

      return this.$http
        .post(url, this.requestData)
        .success(resultHandler);
    }
  }
}