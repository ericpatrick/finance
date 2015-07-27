///<reference path="./_references.d.ts"/>


module gogeo {

  export var settings;
  export var placesToSearch;

  export class Configuration {
    static getPlacesToSearch() {
      return <any> placesToSearch;
    }

    static get apiUrl() {
      return <string> settings["api.url"];
    }

    static get apiExtraUrl() {
      return <string> settings["api_extra.url"];
    }

    static get tileUrl() {
      return <string> settings["tile.url"];
    }

    static get subdomains() {
      return <string[]> settings["subdomains"];
    }

    static makeUrl(path: string) {
      var serverUrl: string = Configuration.apiUrl;

      if (path.match(".*tile.png.*") || path.match(".*cluster.json.*")) {
        serverUrl = Configuration.tileUrl;
      }

      if (serverUrl && !serverUrl.endsWith("/")) {
        serverUrl = serverUrl + "/";
      }

      return "http://" + serverUrl + (path.startsWith("/") ? path.substring(1) : path);
    }

    static makeExtraUrl(path: string) {
      var serverUrl: string = Configuration.apiExtraUrl;

      if (serverUrl && !serverUrl.endsWith("/")) {
        serverUrl = serverUrl + "/";
      }

      return "http://" + serverUrl + (path.startsWith("/") ? path.substring(1) : path);
    }

    static getTotalTweetsUrl(): string {
      return "http://maps.demos.gogeo.io/1.0/tools/totalRead";
    }

    static getDateRangeUrl(): string {
      return Configuration.makeUrl("aggregations/" + Configuration.getDatabaseName() + "/" + Configuration.getCollectionName() + "/stats?mapkey=" + Configuration.getMapKey() + "&field=" + Configuration.getDateField());
    }

    static getPlaceUrl(place: string): string {
      return "http://maps.demos.gogeo.io/1.0/tools/where/" + place;
    }

    static getCollectionName(): string {
      return <string> settings["collection"];
    }

    static getShortenUrl(): string {
      return "http://maps.demos.gogeo.io/1.0/tools/short";
    }

    static getDatabaseName(): string {
      return "demos";
    }

    static getMapKey(): string {
      // TODO: Export this to development/deployment config file
      return "123";
    }

    static getDateField(): string {
      // TODO: Export this to development/deployment config file
      return "datemmdd";
    }

    static getValueField(): string {
      // TODO: Export this to development/deployment config file
      return "value";
    }

    static getInterval(): string {
      // TODO: Export this to development/deployment config file
      return "day";
    }

    static getAggField(): string {
      // TODO: Export this to development/deployment config file
      return "typeestab"; 
    }

    static getAggSummary(): string {
      // TODO: Export this to development/deployment config file
      return Configuration.getValueField(); 
    }

    static getAggSize(): number {
      // TODO: Export this to development/deployment config file
      return 0;
    }

    static getAggChartField(): string {
      // TODO: Export this to development/deployment config file
      return Configuration.getValueField(); 
    }

    static getTypePayGroupBy(): string {
      // TODO: Export this to development/deployment config file
      return "sum,typepay"; 
    }

    static getTypeEstabGroupBy(): string {
      // TODO: Export this to development/deployment config file
      return "sum,typeestab.raw"; 
    }

    static getSummaryGroupBy(): string {
      // TODO: Export this to development/deployment config file
      return "sum,period"; 
    }

    static getPlaceFields(): Array<string> {
      // TODO: Export this to development/deployment config file
      return [ "city", "state" ];
    }

    static getReducedTypeEstabName(): any {
      // TODO: Export this to development/deployment config file
      return {
        "Restaurantes e outros serviços de alimentação e bebidas": "restaurantes",
        "Comércio varejista de equipamentos de informática e comunicação; equipamentos e artigos de uso doméstico": "informática",
        "Comércio varejista de produtos alimentícios, bebidas e fumo": "alimentos",
        "Comércio varejista de material de construção": "construção",
        "Comércio varejista de produtos farmacêuticos, perfumaria e cosméticos e artigos médicos, ópticos e ortopédicos": "farmacêutico",
        "Comércio varejista de combustíveis para veículos automotores": "combustíveis",
        "Hotéis e similares": "hotéis"
      };
    }

    static tweetFields(): Array<string> {
      // TODO: Export this to development/deployment config file
      return [
        "people",
        "address",
        Configuration.getValueField(),
        "typepay",
        "payway",
        "typeestab",
        "flag",
        "nameestab",
        Configuration.getDateField(),
        "city",
        "state",
        "cnpj",
        "status"
      ];
    }
  }

  var mod = angular.module("gogeo", ["ngRoute", "ngCookies", "angularytics", "linkify", "ngGeolocation", "nvd3", "angular-capitalize-filter", "angucomplete-alt"])
    .config([
      "$routeProvider",
      "AngularyticsProvider",
      ($routeProvider: ng.route.IRouteProvider, angularyticsProvider: angularytics.AngularyticsProvider) => {
        $routeProvider
          .when("/dashboard", {
            controller: "DashboardController",
            controllerAs: "dashboard",
            templateUrl: "dashboard/page.html",
            reloadOnSearch: false
          })
          .otherwise({
            redirectTo: "/dashboard",
            reloadOnSearch: false
          });
        if (window.location.hostname.match("gogeo.io")) {
          angularyticsProvider.setEventHandlers(["Google"]);
        } else {
          angularyticsProvider.setEventHandlers(["Console"]);
        }
      }
    ]).run(
      function(Angularytics) {
        Angularytics.init();
      }
    );

  export interface INamed {
    $named: string;
  }

  export interface INamedType extends Function, INamed {

  }

  export function registerController<T extends INamedType>(controllerType: T) {
    console.debug("registrando controlador: ", controllerType.$named);
    mod.controller(controllerType.$named, <Function> controllerType);
  }

  export function registerService<T extends INamedType>(serviceType: T) {
    console.debug("registrando serviço: ", serviceType.$named);
    mod.service(serviceType.$named, serviceType);
  }

  export function registerDirective(directiveName: string, config: any) {
    console.debug("registrando diretiva: ", directiveName);
    mod.directive(directiveName, config);
  }

  export function registerFilter(filterName: string, filter: (any) => string) {
    console.debug("registrando filtro: ", filterName);
    mod.filter(filterName, () => filter);
  }

}