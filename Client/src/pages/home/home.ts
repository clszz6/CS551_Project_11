import {Component, OnInit} from '@angular/core';
import {ModalController, PopoverController} from 'ionic-angular';
import {ListPage} from '../list/list';
import {DetailsPage} from '../details/details';
import {AirTrafficAwarenessClient} from '../../providers/air-traffic-awareness-client';
import {Airplane} from '../../models/airplane';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit {

  views: { [view: string]: AirplaneView } = {};
  connected = false;

  constructor(private modalController: ModalController,
              private popoverController: PopoverController,
              private ata: AirTrafficAwarenessClient) {
  }

  ngOnInit(): void {
    const svg = <any>document.getElementById('svg') as SVGSVGElement;
    const container = svg.getElementById('container') as SVGGElement;
    const airplaneNode = svg.getElementById('airplane') as SVGGElement;
    airplaneNode.remove();

    if (!this.ata.currentAirplane) {
      const modal = this.modalController.create(ListPage, null, {
        enableBackdropDismiss: false
      });
      modal.onDidDismiss(data => {
        console.log(data);
        this.ata.currentAirplane = data;
        this.connected = true;
      });
      modal.present().catch(err => console.error(err));
    }

    this.ata.onUpdate.subscribe(airplanes => {
      // Mark all existing views for deletion.
      Object.values(this.views).forEach(view => view.touched = false);

      airplanes.forEach((airplane: Airplane) => {
        const {heading, identifier, proximity} = airplane;

        if (!proximity || !proximity.position || (!proximity.position.x && !proximity.position.y)) {
          return;
        }

        if (this.ata.currentAirplane && identifier === this.ata.currentAirplane.identifier) {
          container.setAttribute('transform', `rotate(${-heading} 360 360)`);
        }

        let view = this.views[identifier];
        if (!view) {
          const node = airplaneNode.cloneNode(true) as SVGGElement;
          node.id = identifier;
          container.appendChild(node);
          node.onclick = (event) => this.showDetails(event, airplane);
          view = new AirplaneView(node);
          this.views[identifier] = view;
        }

        view.airplane = airplane;
        view.touched = true;
      });

      // Remove all view that were not updated.
      Object.keys(this.views).forEach(k => {
        const view = this.views[k];
        if (!view.touched) {
          view.svgElement.remove();
          delete this.views[k];
        }
      });
    });
  }


  showDetails(event: Event, airplane) {
    const popover = this.popoverController.create(DetailsPage, {airplane});
    popover.present({ev: event}).catch(err => console.error(err));
  }
}

class AirplaneView {
  touched = false;

  constructor(public svgElement: SVGGElement) {}

  set airplane(airplane: Airplane) {
    const proximity = airplane.proximity;
    this.svgElement.className.baseVal = `airplane ${proximity.flightZone}`;
    this.svgElement.setAttribute('data-distance', `${proximity.distance}`);
    this.svgElement.setAttribute('data-heading', `${airplane.heading}`);
    const transform = [
      `translate(${proximity.position.x} ${proximity.position.y})`,
      `rotate(${airplane.heading} 0 0)`,
      `scale(0.5)`
    ];
    this.svgElement.setAttribute('transform', transform.join(' '));
  }
}
