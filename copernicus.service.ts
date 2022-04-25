import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { MapService } from '@map/map.service';
import { SearchService } from '@search/search.service';

import { GeoJSON } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { Heatmap as HeatmapLayer } from 'ol/layer';

import moment from 'moment';
import _ from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class CopernicusService {

  private _pollution_changed = new Subject<string>();
  public pollution_changed = this._pollution_changed.asObservable();

  private _pollutionSelected: string = '';
  private _domain: any = {
    min: 0,
    max: 0
  }
  private _layers: Array<string> = [];
  private _value_field: Array<string> = [];
  private _weight_moleculus: number = 0;
  private _factor_value: number = 0

  private _heatMapLayerCopernicus!: HeatmapLayer | any;

  constructor(private mapSvc: MapService,
              private search: SearchService) { }


  /** https://teesing.com/en/library/tools/ppm-mg3-converter#ppm-mgm3 */
  public get factor_value(): number {
    return this._factor_value
  }

  public set factor_value(value: number) {
    this._factor_value = value;
  }

  public get layers(): Array<string> {
    return this._layers
  }

  public set layers(value: Array<string>) {
    this._layers = value;
  }

  public get value_field(): Array<string> {
    return this._value_field
  }

  public set value_field(value: Array<string>) {
    this._value_field = value;
  }

  public get weight_moleculus(): number {
    return this._weight_moleculus;
  }

  public set weight_moleculus(value: number) {
    this._weight_moleculus = value;
  }

  /**
   *
   */
  public get pollutionSelected(): string {
    return this._pollutionSelected
  }

  /**
   *
   */
  public set pollutionSelected(value: string) {
    this._pollutionSelected = value;
    this.domain = value;

    switch (value) {
      case 'SO2':
        this.layers = ['sulfurdioxide']
        this.value_field = ['sulfurdioxide_total_vertical_column']
        this.weight_moleculus = 64.066;
        break;
      case 'NO2':
        this.layers = ['nitrogendioxide']
        this.value_field = ['nitrogendioxide_tropospheric_column']
        this.weight_moleculus = 46.0055;
        break;
      case 'HCHO':
        this.layers = ['formaldehyde']
        this.value_field = ['formaldehyde_tropospheric_vertical_column']
        this.weight_moleculus = 30.031
        break;
      case 'CO':
        this.layers = ['carbonmonoxide']
        this.value_field = ['carbonmonoxide_total_column_corrected']
        this.weight_moleculus = 28.01;
        break;
      case 'CH4':
        this.layers = ['methane']
        this.value_field = ['methane_mixing_ratio']
        this.weight_moleculus = 16.04;
        break;
      case 'PM2.5':
      case 'PM10':
        this.layers = ['aerosol']
        this.value_field = ['aerosol_index_340_380_precision', 'aerosol_index_354_388_precision']
        this.weight_moleculus = 1449.1274;
        break;
      default:
        this.layers = []
        break;
    };

    // convert 1 microg / m^3 to mol/m^2
    this.factor_value = this.weight_moleculus / 1000;
    this._pollution_changed.next(value);
  }

  /**
   *
   */
  public get domain(): any {
    return this._domain
  }

  public set domain(value: string) {

    switch (value) {
      case 'SO2':
        this._domain.max = 120;
        break;
      case 'NO2':
        this._domain.max = 100;
        break;
      case 'HCHO':
      case 'CO':
      case 'CH4':
      case 'PM2.5':
        this._domain.max = 120;
        break;
      case 'PM10':
        this._domain.max = 150;
        break;
      default:
        this._domain.max = 0;
        break;
    }

    this._domain.max = this._domain.max * this.factor_value;

  }

  /**
   *
   */
  public get filter(): string {
    return `${this.search.get_filter('delta_time')})`
  }

  /**
   *
   */
  public update_pollution() {
    this._pollution_changed.next(this.pollutionSelected);
  }

  /**
   *
   */
  public removeLayer(): void {
    if (this._heatMapLayerCopernicus != null && this._heatMapLayerCopernicus != undefined) {
      this.mapSvc.map.removeLayer(this._heatMapLayerCopernicus)
    }
  }

  /**
   *   add heatmap
   *
   *   Example url to get features from geoserver
   *   http://www.openpuglia.org:8080/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=stations_values&outputFormat=application/json&srsname=EPSG:4326&CQL_FILTERs=(['ts'] BEFORE '2022-03-13T23:00:00Z')
   */
  public load(): void {

    this.removeLayer();

    const url: string = this.mapSvc.get_url(this.layers, this.filter)

    const station_values = new VectorSource({
      format: new GeoJSON(),
      url: url,
      strategy: bboxStrategy,
    });

    this._heatMapLayerCopernicus = new HeatmapLayer({
      source: station_values,
      blur: 60,
      radius: 15,
      opacity: 0.7,
      gradient: ['#FF9580','#ff949b','#fc97b6','#ef9ecd','#dca7df','#c6b0eb'],
      weight: (feature: any) => {
        let value: number | any = 0;
        for (let i=0; i <= _.size(this.value_field); i++) {
          value = feature.get(this.value_field[i]) != null && feature.get(this.value_field[i]) != undefined ? feature.get(this.value_field[i]) : null;
          if (value != null) {
            break;
          }
        }
        return (1 - 0) * (parseFloat(value) - this.domain.min) / (this.domain.max - this.domain.min) + 0
      },
    });

    this.mapSvc.map.addLayer(this._heatMapLayerCopernicus);

  }

}
