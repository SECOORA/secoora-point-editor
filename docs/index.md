# SECOORA Gap Analysis Tool

![Map of Region][header]

A web-based tool to aid researches in the gap analysis and planning for observing assets in the South Atlantic (US) and Gulf of Mexico region.

*   [Website](https://secoora.github.io/secoora-point-editor/)
*   [Documentation](https://secoora.github.io/secoora-point-editor/docs)
*   [Code](https://github.com/SECOORA/secoora-point-editor)

Need help? Have Questions? Please email [dmac@secoora.org](mailto:dmac@secoora.org).


## Default Layers

By default there are six layers presented by default in the tool.

*   **Bathymetry**

    This layer is pulled from [here](https://github.com/SECOORA/static_assets/blob/master/bathy/bathy.geojson)

*   **HF Radar**

    The locations and coverage of HFRadar stations in the region. This layer is generated from [this code](https://github.com/SECOORA/static_assets/blob/master/hfradar/convert.py) and [this spreadsheet](https://docs.google.com/spreadsheets/d/11hWfIr4lrKP-RviEwSio6dZgnm0oUFUII9WChPDzeAw/edit#gid=62536835)

*   **Glider Tracks**

    Long-range glider tracks for the region

*   **Glider Tracks (triangle)**

    Glider tracks that are focused on single areas of interest

*   **Regional Stations**

    Regional observing platforms in the region. This excludes tide gauges and USGS stream flow stations as this tool was developed with off-short monitoring in mind. This layer is generated from [this code](https://github.com/SECOORA/static_assets/blob/master/stations/regional/get.py).

*   **SECOORA Funded**

    Observing assets that SECOORA funds in the region. Some of these stations are also in the "Regional Stations" layer. This layer is generated from [this code](https://github.com/SECOORA/static_assets/blob/master/stations/assets/get.py) and [this spreadsheet](https://docs.google.com/spreadsheets/d/1ECXoa43uq9Gr8REZF-7EGlxNa1mkP7-4YturX0nFK7s/edit).


## Adding a User Layer


#### Supported Formats

Users can upload data into the tool to add their own layers. These layers can then be exported and sent to other collaborators for viewing and further analysis.

*   CSV

    There must be a column named "lat" or "latitude" and a column named "lon" or "longitude" in the uploaded CSV file.

*   [GeoJSON](http://geojson.org/) FeatureCollection

    This is the format exported by the tool for sharing. See [Exporting and Sharing User Layers](#exporting-and-sharing-user-layers).


#### Tutorial

1.  Click the "New Layer" button

    ![][add_01]

2.  Name your layer

    ![][add_02]

    **At this point you can click "Save to Map" if you don't have existing data to upload**

3.  Add existing data to your layer **Optional**

    [Example CSV](sample.csv)  /  [Example GeoJSON](sample.geojson)

    *   Enter existing GeoJSON or CSV data into the text box and click "Save to Map".

        ![][add_03]

    *   Upload a CSV or GeoJSON file and click "Save to Map"

        ![][add_04]

4.  Your data should appear as a new layer on the map

    ![][add_05]


## Managing User layers

Once you have a User Layer you can edit its properties.

#### Tutorial

1.  Click on the title of the layer to bring up the editing panel.

    ![Managing a User Layer][manage_01]

2.  You can add and remove rows as needed from any User Layer

    ![Adding data rows][manage_02]


## Exporting and Sharing User Layers

Exporting a User Layer allows for the sharing of data between collaborators.

Click on the "Export" button to bring up a dialog. Layers are always exported as GeoJSON. You can copy and paste the contents of the text box or click the "Download" button to download the GeoJSON to your computer. Exported layers can be imported by following the [Adding a User Layer](#adding-a-user-layer) instructions.

![Exporting a User Layer][manage_03]




[header]: img/header.png
[add_01]: img/add_01.png
[add_02]: img/add_02.png
[add_03]: img/add_03.png
[add_04]: img/add_04.png
[add_05]: img/add_05.png
[manage_01]: img/manage_01.png
[manage_02]: img/manage_02.png
[manage_03]: img/manage_03.png
