import { XMLParser, XMLBuilder } from "fast-xml-parser";

export const canadaShippingRate = async (zip: string): Promise<any> => {
  const XMLdata = `
  <mailing-scenario xmlns=”http://www.canadapost.ca/ws/ship/rate-v4”>
  <customer-number>0009861747</customer-number>
  <origin-postal-code>V2A5K6</origin-postal-code>
  <parcel-characteristics><weight>1.0</weight></parcel-characteristics>
  <destination><domestic><postal-code>${zip}</postal-code></domestic></destination>
  </mailing-scenario>`;
  const parser = new XMLParser();
  let result = parser.parse(XMLdata);
  console.log(JSON.stringify(result, null,4));
  const builder = new XMLBuilder();
  const output = builder.build(result);
  const rates = await fetch('https://soa-gw.canadapost.ca/rs/ship/price', {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/vnd.cpc.ship.rate-v4+xml',
      'Accept': 'application/vnd.cpc.ship.rate-v4+xml',
      'Authorization': 'Basic ' + btoa('c68ad9c01ff34064:4e5b13b80727ba8364f566'),
      'Accept-language': 'en-CA'
    },
    body: output
  })
  return rates
}
