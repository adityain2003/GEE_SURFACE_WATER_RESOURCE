// DEVELOPED BY Dr. ADITYA KAPOOR, IIT Roorkee

// This script can compute the area under inundation, algal bloom and turbidity on a monthly scale

var FEATURES = ee.FeatureCollection("projects/sat-io/open-datasets/HydroLakes/lake_poly_v10");


var NEBRASKA_BOUNDARY = ee.FeatureCollection("TIGER/2016/States")
                                          .filter(ee.Filter.eq('NAME','Nebraska'))
                                          
var FEATURES = ee.FeatureCollection('projects/adityain2003/assets/WPA_WMA_WRP')
                                  .sort('ID_AK')
                                  
// 178: WILLOW LAKE, ZOOM LEVEL = 15
// 140: PAWNEE LAKE, ZOOM LEVEL = 16
// 164: SWAN CREEK -- DISCARDED
//  96: FREMONT LAKE
var SITE = FEATURES.filter(ee.Filter.eq('ID_AK',96))                                  
        
Map.addLayer(FEATURES,{},'ALL_WETLANDS', false)
//var STUDY_AREA = FEATURES.filter(ee.Filter.eq('Lake_name','Lake McConaughy'))

var STUDY_AREA = SITE
Map.addLayer(STUDY_AREA,{},'STUDY_AREA')
Map.centerObject(STUDY_AREA,16)

  function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
            qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000)
      .select("B.*")
      .copyProperties(image, ["system:time_start"]);
                              }

print('AREA_OF_STUDY_AREA',STUDY_AREA.geometry().area())

var START_DATE = ee.Date.fromYMD(2023,8,01)
var END_DATE = ee.Date.fromYMD(2023,8,31)

var SENTINEL_DATASET = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                      .filterBounds(STUDY_AREA)
                      .filterDate(START_DATE,END_DATE)
                      .map(maskS2clouds)
                      
                      
print('SENTINEL_DATA_SET_SIZE',SENTINEL_DATASET.size())
// ADD NDWI, DYNAMIC WORLD< TIME SERIES
var INDICES_FUNCTION = function (IMAGE) 
                                      {
var MNDWI = IMAGE.normalizedDifference(['B3','B11']).rename('MNDWI')
var NDVI = IMAGE.normalizedDifference(['B8','B4']).rename('NDVI')
var NDCI = IMAGE.normalizedDifference(['B5','B4']).rename('NDCI')
var NDTI = IMAGE.normalizedDifference(['B4','B3']).rename('NDTI')
return IMAGE.addBands(MNDWI).addBands(NDVI).addBands(NDCI).addBands(NDTI)
                                      }


var IC_INDICES = ee.ImageCollection(SENTINEL_DATASET.map(INDICES_FUNCTION))
print('IC_INDICES',IC_INDICES)

var IC_INDICES_MODE = IC_INDICES.median()
print('IC_INDICES_MODE',IC_INDICES_MODE)

var IC_INDICES_MEAN = IC_INDICES_MODE
                  .select(['MNDWI','NDVI','NDCI','NDTI'])
                  .reduceRegion({
                  reducer: ee.Reducer.mean(),
                  geometry: STUDY_AREA,
                  scale: 50,
                                })
                              
                                
print('IC_INDICES_MEAN',IC_INDICES_MEAN)

var SENTINEL_MNDWI_COUNT = IC_INDICES_MODE.select('MNDWI').gt(0.0).eq(1).clip(STUDY_AREA)
                  .reduceRegion({
                  reducer: ee.Reducer.sum(),
                  geometry: STUDY_AREA,
                  scale: 50,
                                })
                                
print('SENTINEL_MNDWI_COUNT',SENTINEL_MNDWI_COUNT)

Map.addLayer(IC_INDICES_MODE.clip(STUDY_AREA).select('MNDWI').gt(0.0),{palette: ['blue']},'IC_INDICES_MNDWI',false)
Map.addLayer(IC_INDICES_MODE.clip(STUDY_AREA).select('NDVI').gt(0.2),{palette: ['white','green']},'IC_INDICES_NDVI',false)
Map.addLayer(IC_INDICES_MODE.clip(STUDY_AREA).select('NDCI').gt(0.1),{palette: ['blue','green']},'IC_INDICES_NDCI',false)
Map.addLayer(IC_INDICES_MODE.clip(STUDY_AREA).select('NDTI').gt(0.2),{palette: ['white','brown']},'IC_INDICES_NDTI',false)

var VISUALIZATION = {
  min: 0.0,
  max: 3000,
  bands: ['B4', 'B3', 'B2'],
};

Map.addLayer(IC_INDICES_MODE,VISUALIZATION,'IC_INDICES_VISUALIZATION',false)

var DW = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
//                      .filterBounds(STUDY_AREA)
                      .filterDate(START_DATE,END_DATE)
                      
var DW_CLASSIFIED = DW.mode().select('label');
var DW_VIS = {
  min: 0,
  max: 8,
  palette: [
    '#419BDF', '#397D49', '#88B053', '#7A87C6', '#E49635', '#DFC35A',
    '#C4281B', '#A59B8F', '#B39FE1'
  ]
};

Map.addLayer(DW_CLASSIFIED, DW_VIS, 'DW_CLASSIFIED');
////////////////////////////////////////////////////////////////
/////////   CALCULATION OF MONTHLY INDICES    //////////////////
////////////////////////////////////////////////////////////////


var YEARS = ee.List.sequence(2019,2023)
var MONTHS = ee.List.sequence(1,12)

//CALCULATION OF MONTHLY INDICES
var MAP_YEAR = function (YEAR) {

var MAP_MONTH = MONTHS.map(function (MONTH) {
var START_DATE = ee.Date.fromYMD(YEAR, MONTH, 1)
var END_DATE = START_DATE.advance(1, 'month')

var SENTINEL_DATASET = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                      .filterBounds(STUDY_AREA)
                      .filterDate(START_DATE,END_DATE)
                      .map(maskS2clouds)

var INDICES_FUNCTION = function (IMAGE) 
                                      {
var MNDWI = IMAGE.normalizedDifference(['B3','B11']).rename('MNDWI')
var NDVI = IMAGE.normalizedDifference(['B8','B4']).rename('NDVI')
var NDCI = IMAGE.normalizedDifference(['B5','B4']).rename('NDCI')
var NDTI = IMAGE.normalizedDifference(['B4','B3']).rename('NDTI')
return IMAGE.addBands(MNDWI)
            .addBands(NDVI)
            .addBands(NDCI)
            .addBands(NDTI)
                                      }


var IC_INDICES = ee.ImageCollection(SENTINEL_DATASET.map(INDICES_FUNCTION))


var SENTINEL_DATASET_MEAN = IC_INDICES.median().clip(STUDY_AREA)
                  .reduceRegion({
                  reducer: ee.Reducer.mean(),
                  geometry: STUDY_AREA,
                  scale: 50,
                                })
                                
var SENTINEL_MNDWI_COUNT = IC_INDICES.select('MNDWI').median().gt(0.0).clip(STUDY_AREA)
                  .reduceRegion({
                  reducer: ee.Reducer.sum(),
                  geometry: STUDY_AREA,
                  scale: 50,
                                })
                                
var SENTINEL_NDVI_COUNT = IC_INDICES.select('NDVI').median().gt(0.2).clip(STUDY_AREA)
                  .reduceRegion({
                  reducer: ee.Reducer.sum(),
                  geometry: STUDY_AREA,
                  scale: 50,
                                })
                                
var SENTINEL_NDTI_COUNT = IC_INDICES.select('NDTI').median().gt(0.2).clip(STUDY_AREA)
                  .reduceRegion({
                  reducer: ee.Reducer.sum(),
                  geometry: STUDY_AREA,
                  scale: 50,
                                })
                                
var SENTINEL_NDCI_COUNT = IC_INDICES.select('NDCI').median().gt(0.1).clip(STUDY_AREA)
                  .reduceRegion({
                  reducer: ee.Reducer.sum(),
                  geometry: STUDY_AREA,
                  scale: 50,
                                })
                                
var CHIRPS_DATA = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
              .select('precipitation')
              .filterDate(START_DATE,END_DATE)
              .sum()
              .clip(STUDY_AREA)  
              
var CHIRPS_DATA_SUM = CHIRPS_DATA
                  .reduceRegion({
                  reducer: ee.Reducer.mean(),
                  geometry: STUDY_AREA,
                  scale: 566,
                                })
                                
var ERA_5_DATA = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
              .filterDate(START_DATE,END_DATE)
              // .mean()
              // .clip(STUDY_AREA)  
              
var ERA_DATA_MEAN = ERA_5_DATA.sum().select('total_evaporation_sum').clip(STUDY_AREA) 
                  .reduceRegion({
                  reducer: ee.Reducer.mean(),
                  geometry: STUDY_AREA,
                  scale: 132,
                                })

var MONTHLY_DATA = ee.Feature(null, {
    'YEAR': YEAR,
    'MONTH': MONTH,
    'MONTHLY_COUNT_NDVI': ee.Number(SENTINEL_NDVI_COUNT.get('NDVI')),
    'MONTHLY_COUNT_MNDWI': ee.Number(SENTINEL_MNDWI_COUNT.get('MNDWI')),
    'MONTHLY_COUNT_NDCI': ee.Number(SENTINEL_NDCI_COUNT.get('NDCI')),
    'MONTHLY_COUNT_NDTI': ee.Number(SENTINEL_NDTI_COUNT.get('NDTI')),
    'MONTHLY_PRECIPITATION': CHIRPS_DATA_SUM.get('precipitation'),
    'EVAPO_TRANSPIRATION_m': ee.Number(ERA_DATA_MEAN.get('total_evaporation_sum'))
                            .multiply(ee.Number(-1)),    
    'MONTH and YEAR': START_DATE.format('YYYY-MM-dd')
  })
return MONTHLY_DATA
})  
return MAP_MONTH
} //END of MAP_YEAR

var MONTHLY_DATA = ee.FeatureCollection(YEARS.map(MAP_YEAR).flatten())

print('MONTHLY_DATA',MONTHLY_DATA)
//END OF CALCULATION OF MONTHLY RAINFALL

Export.table.toDrive({
  collection: MONTHLY_DATA,
  description:'MONTHLY_DATA_INDICES_2019_2023_FREMONT_LAKE',
  fileFormat: 'CSV'
});

// THRESHHOLDS; 
// MNDWI: 
//    https://www.usgs.gov/special-topics/remote-sensing-phenology/science/ndvi-foundation-remote-sensing-phenology#:~:text=NDVI%20values%20range%20from%20%2B1.0,(approximately%200.2%20to%200.5).


//NDCI:
//0 to 0.7 moderately high algal bloom


// NDVI threshold: 0.2 above is schrub scrub and forest
// https://earthobservatory.nasa.gov/features/MeasuringVegetation#:~:text=The%20most%20common%20measurement%20is,rainforests%20(0.6%20to%200.8).
