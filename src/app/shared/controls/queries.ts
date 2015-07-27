///<reference path="./interfaces.ts" />

module gogeo {

  export class NeSwPoint {
    constructor(public ne:L.LatLng, public sw:L.LatLng) {

    }
  }

  export class TextQueryBuilder implements Query {
    static HashtagText = ["entities.hashtags.text"];
    static UserScreenName = ["user.screen_name"];
    static Text = ["text"];
    static Place = Configuration.getPlaceFields();

    constructor(public fields: Array<string>, public term: string) {}

    build() {
      return {
        query: {
          query_string: {
            query: this.term,
            fields: this.fields
          }
        }
      };
    }
  }

  export class BoolQuery implements Query {
    private requestData: any = {
      must: []
    };

    constructor() {}

    addMustQuery(q: Query) {
      this.requestData["must"].push(q.build()["query"]);
    }

    build() {
      return {
        query: {
          bool: this.requestData
        }
      }
    }
  }

  export class ThematicQuery implements Query {
    constructor(public queries: Array<Query>, public prevQuery?: Query) {}

    build() {
      var query = {
        query: {
          filtered: {
            filter: {
              or: {}
            }
          }
        }
      };

      var filters = [];

      if (this.prevQuery) {
        query["query"]["filtered"]["query"] = this.prevQuery["query"];
      }

      for (var index in this.queries) {
        var stq = this.queries[index];

        if (stq instanceof SourceTermQuery || stq instanceof TextQueryBuilder) {
          filters.push(stq.build());
        } else if (stq["query"]["filtered"]["filter"]["or"]["filters"]) {
          var subFilters = stq["query"]["filtered"]["filter"]["or"]["filters"];
          for (var k in subFilters) {
            filters.push(subFilters[k]);
          }
        }
      }

      query["query"]["filtered"]["filter"]["or"]["filters"] = filters;

      return query;
    }
  }

  export class DateRangeQueryBuilder implements Query {
    static DateRange = Configuration.getDateField();

    constructor(public field: string, public range: IDateRange) {}

    build() {
      var query = {
        range : {}
      };

      var fieldRestriction = query.range[this.field] = {};
      var range = this.range;

      if (range.start) {
        fieldRestriction["gte"] = this.format(range.start);
      }

      if (range.end) {
        fieldRestriction["lte"] = this.format(range.end);
      }

      return query;
    }

    format(date: Date) {
      return moment(date).format("YYYY-MM-DD");
    }
  }

  export class ValueRangeQueryBuilder implements Query {
    static ValueRange = Configuration.getValueField();

    constructor(public field: string, public range: IValueRange) {}

    build() {
      var query = {
        range : {}
      };

      var fieldRestriction = query.range[this.field] = {};
      var range = this.range;

      if (range.min) {
        fieldRestriction["gte"] = range.min;
      }

      if (range.max) {
        fieldRestriction["lte"] = range.max;
      }

      return query;
    }
  }

  export class SourceTermQuery implements Query {

    constructor(public term: string) {}

    build() {
      return {
        query: {
          term: {
            "typeestab.raw": this.term
          }
        }
      }
    }
  }

  export class MatchPhraseQuery implements Query {

    constructor(public term: string, public field: string) {}

    build() {
      var query = {
        match_phrase: {
        }
      }
      query["match_phrase"][this.field] = {
        query: this.term
      };
      
      return query;
    }
  }
}