import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ClarityModule } from 'clarity-angular';
import { FormsModule } from '@angular/forms';


import {MapstateServiceModule} from '@ukis/services/src/app/mapstate/mapstate.module';
import { LayersServiceModule } from '@ukis/services/src/app/layers/layers.module';
import { MapcontrolModule } from '@ukis/mapcontrol/src/app/mapcontrol/mapcontrol.module';
//import {  } from '@ukis/mapcontrol/src/app/mapnavigator/mapnavigator.module';
import { OlMapModule } from '@ukis/ol-map//src/app/ol-map/ol-map.module';


import { UkisComponent } from './ukis.component';
import { GlobalAlertComponent } from './global-alert/global-alert.component';
import { HeaderComponent } from './header/header.component';
import { LayerlistComponent } from './layerlist/layerlist.component';


@NgModule({
  declarations: [
    UkisComponent,
    GlobalAlertComponent,
    HeaderComponent,
    LayerlistComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ClarityModule.forRoot(),
    MapstateServiceModule.forRoot(),
    LayersServiceModule.forRoot(),
    OlMapModule,
    MapcontrolModule
  ],
  providers: [],
  bootstrap: [UkisComponent]
})
export class UkisModule { }
