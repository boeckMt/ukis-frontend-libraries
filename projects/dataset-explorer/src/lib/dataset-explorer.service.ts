import { Injectable, Input } from '@angular/core';

import { Subscription } from 'rxjs';
import { LayerGroup, VectorLayer, RasterLayer, IRasterLayerOptions, Layer } from '@ukis/datatypes-layers';
import { IOwsContext, IOwsResource, IOwsOffering } from '@ukis/datatypes-owc-json';
import { LayersService } from '@ukis/services-layers';
import { MapStateService } from '@ukis/services-map-state';
import { OwcJsonService } from '@ukis/services-owc-json';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DatasetExplorerService {

  // @Input('layers') layers: LayersService;
  //@Input('mapState') mapState: MapStateService;
  observations: Array<any>;
  observationProperties: Array<any>

  layergroups: Array<LayerGroup>
  layerGroupsSubscription: Subscription;

  constructor(
    public http: HttpClient,
    private owcSvc: OwcJsonService) {
    /*
    this.layerGroupsSubscription = this.layersSvc.getLayerGroups().subscribe(layergroups => {
      this.layergroups = layergroups;
    });
    */
  }

  getObservations(url: string): Observable<IOwsContext> {
    return this.http.get(url).pipe(map((response: IOwsContext) => response));
  }

  /* 
  * this function name is misleading: it should be createLayer, as it creates a Vector or RasterLayer and returns it to the caller
  */
  addObservation(observation: IOwsResource) {
    let offerings = observation.properties.offerings;


    for (let offering of offerings) {
      let code = this.getOfferingCode(offering.code);

      switch (code) {
        case "wms": {
          return this.createRasterLayerFromOffering(offering, observation);

        }
        case "wfs": {
          return this.createVectorLayerFromOffering(offering, observation);

        }
      }
    }

  }


 

  /**
   * retrieve display name of layer, based on IOwsResource and IOwsOffering
   * @param offering 
   * @param observation 
   */
  getDisplayName(offering: IOwsOffering, observation: IOwsResource) {
    let displayName = "";
    if(offering.hasOwnProperty("customAttributes")){
      if (offering.customAttributes.title) {        
        displayName = offering.customAttributes.title;
      } else { 
        displayName = observation.properties.title
      }
    }
    return displayName;
  }


  createVectorLayerFromOffering(offering: IOwsOffering, observation: IOwsResource) {
    return this.owcSvc.createVectorLayerFromOffering(offering, observation);
  }

  createRasterLayerFromOffering(offering: IOwsOffering, observation: IOwsResource) {
    return this.owcSvc.createRasterLayerFromOffering(offering, observation);
  } 

  /**
   * helper function to retrieve the offering code
   * @param offeringCode url poiting to service type: wms, wfs, wmts etc
   */
  getOfferingCode(offeringCode: string): string {
    let code = offeringCode.substr(offeringCode.lastIndexOf("/") + 1);
    return code;
  }

}
