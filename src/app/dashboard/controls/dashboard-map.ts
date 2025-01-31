/// <reference path="../../shell.ts" />
/// <reference path="../services/dashboard-events.ts" />
/// <reference path="../services/dashboard-service.ts" />

/**
 * Created by danfma on 07/03/15.
 */


module gogeo {

    class DashboardMapController {
        static $inject = [
            "$scope",
            "$cookies",
            "$timeout",
            "$location",
            "linkify",
            "$sce",
            "$geolocation",
            DashboardService.$named
        ];

        map: L.Map;
        tweetResult: ITransaction;
        popup: L.Popup;
        query: any = { query: { filtered: { filter: { } } } };
        selected: string = "inactive";
        mapTypes: Array<string> = [ "point", "cluster", "intensity", "thematic" ];
        mapSelected: string = "point";
        drawing: boolean = false;
        baseLayers: L.FeatureGroup<L.ILayer> = null;
        layerGroup: L.LayerGroup<L.ILayer> = null;
        drawnItems: L.FeatureGroup<L.ILayer> = null;
        drawnGeom: IGeomSpace = null;
        restricted: boolean = false;
        canOpenPopup: boolean = true;
        thematicMaps: any = {};
        baseLayerSelected: string = "day";
        levent: any = null;
        thematicSelectedLayers: Array<string> = [
            "restaurantes", "informatica", "alimentos", "construcao", "farmaceutico", "combustiveis", "hoteis"
        ];
        queries: any = {
            restaurantes: "Restaurantes e outros serviços de alimentação e bebidas",
            informatica: "Comércio varejista de equipamentos de informática e comunicação",
            alimentos: "Comércio varejista de produtos alimentícios, bebidas e fumo",
            construcao: "Comércio varejista de material de construção",
            farmaceutico: "Comércio varejista de produtos farmacêuticos, perfumaria e cosméticos e artigos médicos, ópticos e ortopédicos",
            combustiveis: "Comércio varejista de combustíveis para veículos automotores",
            hoteis: "Hotéis e similares",
        }

        _thematicLayers = new Rx.BehaviorSubject<Array<string>>(this.thematicSelectedLayers);
        _selectedMap = new Rx.BehaviorSubject<string>(null);

        constructor(private $scope:         ng.IScope,
                    private $cookies:       ng.cookies.ICookiesService,
                    private $timeout:       ng.ITimeoutService,
                    private $location:      ng.ILocationService,
                    private linkify:        any,
                    private $sce:           ng.ISCEService,
                    private $geo:           any,
                    private service:        DashboardService) {
            this.layerGroup = L.layerGroup([]);
            this.baseLayers = L.featureGroup([]);
        }

        get thematicLayers():Rx.BehaviorSubject<Array<string>> {
            return this._thematicLayers;
        }

        initialize(map: L.Map) {
            this.map = map;

            this.baseLayers.addLayer(this.getDayMap());
            this.map.addLayer(this.baseLayers);

            this.map.on("moveend", (e) => this.onMapLoaded());
            this.map.on("click", (e) => this.openPopup(e));
            this.map.on("draw:created", (e) => this.drawnHandler(e));
            this.map.on("draw:deleted", (e) => this.drawnHandler(e));
            this.map.on("draw:edited", (e) => this.drawnHandler(e));
            this.map.on("draw:editstart", (e) => this.blockPopup());
            this.map.on("draw:editstop", (e) => this.allowPopup());
            this.map.on("draw:deletestart", (e) => this.blockPopup());
            this.map.on("draw:deletestop", (e) => this.allowPopup());

            this.initializeLayer();
            this.drawnItems = new L.FeatureGroup();
            this.map.addLayer(this.drawnItems);
            this.initializeDrawControl();

            this.service.geomSpaceObservable
                .subscribeAndApply(this.$scope, geom => this.handleGeom(geom));

            this.service.placeBoundObservable
                 .where(point => point != null)
                .subscribeAndApply(this.$scope, point => this.fitMap(point));

            this.service.loadParamsObservable
                .subscribeAndApply(this.$scope, (result: any) => {
                    this.loadParams(result);
                });

            Rx.Observable
                .merge<any>(this._selectedMap)
                .throttle(800)
                .subscribe(() => {
                    this.service.updateMapType(this.mapSelected);
                });

            if (!this.$location.search()["center"] && !this.$location.search()["zoom"]) {
                var shareLocation = (this.$cookies["gogeo.shareLocation"] === "true");

                if (this.$cookies["gogeo.firstLoad"] == undefined || shareLocation) {
                    this.$cookies["gogeo.firstLoad"] = false;
                    if (!shareLocation) {
                        this.$cookies["gogeo.shareLocation"] = false;
                    }
                    this.setGeoLocation();
                }
            }
        }

        private loadParams(result: any) {
            if (!result || JSON.stringify(result) === JSON.stringify({})) {
                return;
            }

            var zoom = parseInt(result["zoom"]);

            if (zoom) {
                this.map.setZoom(zoom);
            }

            var centerString = result["center"];

            if (centerString) {
                centerString = centerString.split(",");

                if (centerString.length != 2) {
                    // Compatibility with previous version
                    centerString = centerString.split(";");
                }

                var lat = parseFloat(centerString[0]);
                var lng = parseFloat(centerString[1]);

                var center = new L.LatLng(lat, lng);
                this.map.setView(center);
            }

            var mapType = result["type"];

            if (mapType && this.mapTypes.indexOf(mapType) != (-1)) {
                this.mapSelected = mapType;
            }

            var baseLayer = result["baseLayer"];

            if (baseLayer === "night") {
                this.switchBaseLayer();
            }
        }

        private fitMap(point: L.LatLng) {
            this.map.setView(point, 12);
        }

        initializeLayer() {
            this.map.addLayer(this.layerGroup);

            var layers = this.createLayers();
            for (var i in layers) {
                this.layerGroup.addLayer(layers[i]);
            }

            this.service.queryObservable
                .where(q => q != null)
                .throttle(400)
                .subscribeAndApply(this.$scope, (query) => this.queryHandler(query));

            this.service.tweetObservable
                .subscribeAndApply(this.$scope, (tweet) => this.handlePopupResult(tweet));
        }

        private setGeoLocation() {
            var shareLocation = (this.$cookies["gogeo.shareLocation"] === "true");
            if (shareLocation) {
                var latitude = this.$cookies["gogeo.location.lat"];
                var longitude = this.$cookies["gogeo.location.lng"];
                this.centerMap(latitude, longitude);
            } else {
                this.$geo.getCurrentPosition().then((location) => {
                    var coords = location.coords;
                    this.centerMap(coords.latitude, coords.longitude);
                    this.$cookies["gogeo.shareLocation"] = "true";
                    this.$cookies["gogeo.location.lat"] = coords.latitude;
                    this.$cookies["gogeo.location.lng"] = coords.longitude;
                });
            }
        }

        private centerMap(lat: number, lng: number) {
            if (lat && lng) {
                var center = new L.LatLng(lat, lng);
                this.map.setView(center, 12);
            }
        }

        private getNightMap() {
            var mapOptions = {
                // How you would like to style the map. 
                // This is where you would paste any style found on Snazzy Maps.
                styles: [
                  { "stylers": [ { "visibility": "simplified" } ] },
                  { "stylers": [ { "color": "#131314" } ] },
                  {
                    "featureType": "water",
                    "stylers": [ { "color": "#131313" }, { "lightness": 7 } ]
                  },
                  {
                    "elementType": "labels.text.fill",
                    "stylers": [ { "visibility": "on" }, { "lightness": 25 } ]
                  },
                  {
                    "featureType": "road.highway",
                    "elementType": "geometry.fill",
                    "stylers": [
                      {
                        "color": "#000000"
                      },
                      {
                        "lightness": 17
                      }
                    ]
                    },
                    {
                      "featureType": "road.highway",
                      "elementType": "geometry.stroke",
                      "stylers": [
                        {
                          "color": "#000000"
                        },
                        {
                          "lightness": 29
                        },
                        {
                          "weight": 0.2
                        }
                      ]
                    },
                    {
                      "featureType": "road.arterial",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#000000"
                        },
                        {
                          "lightness": 18
                        }
                      ]
                    },
                    {
                      "featureType": "road.local",
                      "elementType": "geometry",
                      "stylers": [
                        {
                          "color": "#000000"
                        },
                        {
                          "lightness": 16
                        }
                      ]
                    }
                ]
            };

            var options = {
                mapOptions: mapOptions,
                maptiks_id: "night-map"
            };

            return new L.Google("ROADMAP", options);
        }

        private getDayMap() {
            return new L.Google('ROADMAP', { maptiks_id: "day-map" });
        }

        private blockPopup() {
            this.canOpenPopup = false;
        }

        private allowPopup() {
            this.canOpenPopup = true;
        }

        private handleGeom(geom: IGeomSpace) {

        }

        private initializeDrawControl() {
            var drawOptions = {
                draw: {
                    polyline: false,
                    polygon: false,
                    circle: false, // Turns off this drawing tool
                    marker: false,
                    rectangle: {
                      showArea: true,
                      shapeOptions: {
                        color: "blue"
                      }
                    }
                },
                edit: {
                    featureGroup: this.drawnItems
                },
                trash: true
            };

            var drawControl = new L.Control.Draw(drawOptions);
            this.map.addControl(drawControl);
        }

        private queryHandler(query: any) {
            if (JSON.stringify(query) !== JSON.stringify(this.query)) {
                this.query = query;
                this.updateLayer();
            } else {
                // same query, don't update the map
            }
        }

        private drawnHandler(event: any) {
            var layerType = event["layerType"];
            var eventType = event["type"];
            var layer = event["layer"];

            if (!layer) {
                layer = this.drawnItems.getLayers()[0];
            }

            this.drawnItems.clearLayers();

            if (layer) {
                this.restricted = false;
                var geojson = layer.toGeoJSON();
                this.drawnItems.addLayer(layer);
                this.onMapLoaded(this.getDrawGeomSpace(geojson["geometry"]));

                layer.on("click", (e) => this.openPopup(e))
            } else {
                this.restricted = false;
                this.drawnGeom = null;
                this.updateLayer();
                this.onMapLoaded();
            }
        }

        private getDrawGeomSpace(geojson: any): IGeomSpace {
            return {
                source: "draw",
                type: geojson["type"],
                coordinates: geojson["coordinates"]
            }
        }

        private createLayers(): Array<L.ILayer> {
            var url = this.configureUrl();
            var options = {
                subdomains: Configuration.subdomains,
                maptiks_id: this.mapSelected
            };

            if (["point", "intensity"].indexOf(this.mapSelected) != (-1)) {
                return [L.tileLayer(url, options)];
            } else if (this.mapSelected === "thematic") {
                return this.createThematicLayers(url, options);
            } else if (this.mapSelected === 'cluster') {
                return [this.createClusterLayer(url)];
            }
        }

        private configureUrl(): string {
            var database = Configuration.getDatabaseName();
            var collection = Configuration.getCollectionName();
            var buffer = 8;
            var stylename = "gogeo_many_points";
            var serviceName = "tile.png";

            if (this.mapSelected === "cluster") {
                serviceName = "cluster.json";
            }

            if (this.mapSelected === "thematic") {
                stylename = "restaurantes_1";
            }

            if (this.mapSelected === "intensity") {
                stylename = "gogeo_intensity";
            }

            var url = "/map/"
                + database + "/" +
                collection + "/{z}/{x}/{y}/"
                + serviceName + "?buffer=" + buffer +
                "&stylename=" + stylename + "&mapkey=123";

            if (this.query) {
                url = `${url}&q=${encodeURIComponent(angular.toJson(this.query))}`;
            }

            if (this.drawnGeom) {
                url = `${url}&geom=${angular.toJson(this.drawnGeom)}`;
            }

            return Configuration.makeUrl(url);
        }

        private createThematicLayers(url: string, options: any) {
            var array = [];
            var layer = null;

            url = this.configureThematicUrl("restaurantes", "restaurantes_1");
            layer = L.tileLayer(url, options);
            this.thematicMaps["restaurantes"] = layer;
            array.push(layer);

            url = this.configureThematicUrl("informatica", "informatica_1");
            layer = L.tileLayer(url, options);
            this.thematicMaps["informatica"] = layer;
            array.push(layer);

            url = this.configureThematicUrl("alimentos", "alimentos_1");
            layer = L.tileLayer(url, options);
            this.thematicMaps["alimentos"] = layer;
            array.push(layer);

            url = this.configureThematicUrl("construcao", "construcao_1");
            layer = L.tileLayer(url, options);
            this.thematicMaps["construcao"] = layer;
            array.push(layer);

            url = this.configureThematicUrl("farmaceutico", "farmaceutico_1");
            layer = L.tileLayer(url, options);
            this.thematicMaps["farmaceutico"] = layer;
            array.push(layer);

            url = this.configureThematicUrl("combustiveis", "combustiveis_1");
            layer = L.tileLayer(url, options);
            this.thematicMaps["combustiveis"] = layer;
            array.push(layer);

            url = this.configureThematicUrl("hoteis", "hoteis_1");
            layer = L.tileLayer(url, options);
            this.thematicMaps["hoteis"] = layer;
            array.push(layer);

            return array;
        }

        private configureThematicUrl(term: string, stylename: string): string {
            var originalQuery = this.query;

            if (term === 'others') {
                var thematicQuery = this.createThematicOthersQuery(this.query);
                this.query = thematicQuery.build();
            } else {
                var sourceTermQuery = new SourceTermQuery(this.queries[term]);
                var thematicQuery = new ThematicQuery([sourceTermQuery], this.query);
                this.query = thematicQuery.build();
            };

            var url = this.configureUrl();
            url = url.replace("restaurantes_1", stylename);

            this.query = originalQuery;

            return url;
        }

        private createThematicOthersQuery(query?: TextQueryBuilder): ThematicQuery {
            var q1 = new TextQueryBuilder(["source"], "*ipad*");
            var q2 = new TextQueryBuilder(["source"], "*windows*");
            var q3 = new TextQueryBuilder(["source"], "*jobs*");
            var q4 = new TextQueryBuilder(["source"], "*mac*");

            var tq = null;

            if (query) {
                tq = new ThematicQuery([ q1, q2, q3, q4 ], query);
            } else {
                tq = new ThematicQuery([ q1, q2, q3, q4 ]);
            }

            return tq;
        }

        switchBaseLayer() {
            this.baseLayers.clearLayers();

            if (this.baseLayerSelected === "day") {
                this.baseLayerSelected = "night";
                this.baseLayers.addLayer(this.getNightMap());
            } else {
                this.baseLayerSelected = "day";
                this.baseLayers.addLayer(this.getDayMap());
            }

            this.service.updateMapBase(this.baseLayerSelected);
            this.baseLayers.bringToBack();
        }

        formatDate(dateString: string) {
            var date = new Date(dateString);
            return moment(date).utc().format("LLLL");
        }

        toggleThematicMap(id: string, layer: L.ILayer) {
            if (this.layerGroup.hasLayer(layer)) {
                this.layerGroup.removeLayer(layer);

                this.thematicSelectedLayers.splice(this.thematicSelectedLayers.indexOf(id), 1);
            } else {
                this.layerGroup.addLayer(layer);

                this.thematicSelectedLayers.splice(0, 0, id);
            }

            this._thematicLayers.onNext(this.thematicSelectedLayers);
        }

        onMapLoaded(geom?: IGeomSpace) {
            this.service.updateMapZoom(this.map.getZoom());
            this.service.updateMapCenter(this.map.getCenter());

            if (this.restricted) {
                return;
            }

            if (geom) {
                this.service.updateGeomSpace(geom);
                this.restricted = true;
                this.drawnGeom = geom;
                this.updateLayer();
            } else {
                this.service.updateGeomSpaceByBounds(this.map.getBounds());
            }
        }

        hidePopup() {
            this.map.closePopup(this.popup);
            this.tweetResult = null;
        }

        openPopup(levent: any) {
            var zoom = this.map.getZoom();

            var intersects = true;

            if (!this.canOpenPopup) {
                return;
            }

            if (this.drawnItems.getLayers().length > 0) {
                var layer = <L.Polygon>this.drawnItems.getLayers()[0];
                var bounds = layer.getBounds();
                var point = levent.latlng;
                intersects = bounds.contains(point);
            }

            if ((this.mapSelected === "point" || this.mapSelected === "thematic" ) && intersects) {
                var queries = [];

                for (var index in this.thematicMaps) {
                    var thematicLayer = this.thematicMaps[index];

                    if (this.layerGroup.hasLayer(thematicLayer)) {
                        var query = null;

                        if (index === 'others') {
                            query = this.createThematicOthersQuery().build();
                        } else {
                            query = new SourceTermQuery(this.queries[index]);
                        }

                        queries.push(query);
                    }
                }

                var thematicQuery = new ThematicQuery(queries, this.query);
                this.service.getTransaction(levent.latlng, zoom, thematicQuery);
                this.levent = levent;
            }
        }

        private handlePopupResult(result: Array<ITransaction>) {
            if (!result || result.length == 0) {
                return;
            }

            this.tweetResult = result[0];

            if (!this.tweetResult) {
                return;
            } else {
                var reducedName = Configuration.getReducedTypeEstabName();
                var typeEstab = this.tweetResult["typeestab"];
                this.tweetResult["typeestab"] = reducedName[typeEstab]
            }

            if (this.popup == null) {
                var options = {
                    closeButton: false,
                    className: "marker-popup",
                    offset: new L.Point(-203, -368)
                };
                this.popup = L.popup(options);
                this.popup.setContent($("#tweet-popup")[0]);
            } else {
                this.popup.setContent($("#tweet-popup")[0]);
                this.popup.update();
            }

            this.popup.setLatLng(this.levent.latlng);
            this.map.openPopup(this.popup);
        }

        changeMapType(element: any) {
            this.mapSelected = element.target.id;
            this._selectedMap.onNext(this.mapSelected);

            if ((this.mapSelected === "thematic" || this.mapSelected === "intensity")
                && this.baseLayerSelected === "day") {
                this.switchBaseLayer();
            }

            if (this.mapSelected === "point" && this.baseLayerSelected === "night") {
                this.switchBaseLayer();
            }

            this.updateLayer();
        }

        private updateLayer() {
            this.layerGroup.clearLayers();
            var layers = this.createLayers();

            for (var i in layers) {
                this.layerGroup.addLayer(layers[i]);
            }
        }

        private createClusterLayer(url): L.ILayer {
            var options = {
                subdomains: Configuration.subdomains,
                useJsonP: false
            };

            return new L.TileCluster(url, options);
        }
    }

    registerDirective("dashboardMap", [
        "$timeout",
        ($timeout: ng.ITimeoutService) => {
            return {
                restrict: "C",
                templateUrl: "dashboard/controls/dashboard-map-template.html",
                controller: DashboardMapController,
                controllerAs: "map",
                bindToController: true,

                link(scope, element, attrs, controller:DashboardMapController) {
                    var options = {
                        attributionControl: false,
                        minZoom: 4,
                        maxZoom: 18,
                        center: new L.LatLng(-15, -56), // San Francisco, CA
                        zoom: 5,
                        maptiks_id: "leaflet-map"
                    };

                    var mapContainerElement = element.find(".dashboard-map-container")[0];
                    var map = L.map("map-container", options);

                    controller.initialize(map);
                    $timeout(() => map.invalidateSize(false), 1);

                    scope.$on("$destroy", () => {
                        map.remove();
                    });
                }
            };
        }
    ]);

    registerDirective("errSrc", function() {
        return {
            link: function(scope, element, attrs) {
                element.bind("error", function() {
                    if (attrs.src != attrs.errSrc) {
                        attrs.$set("src", attrs.errSrc);
                    }
                });
            }
        }
    });
}