library("rgdal")
library("jsonlite")
library("metromonitor")

#all files downloaded with wget from command line (wget followed by ftp directory, accompanied by -r option downloaded the entire directory structure)

setwd("/home/alec/Dev/Data/ftp2.census.gov/geo/tiger/TIGER2015/TRACT/")
files <- list.files()
shps <- list()
for(f in files){
  fn <- sub("\\.zip","",f)
  if(f!="unzipped"){
    unzip(f, exdir="unzipped")
    shps[[fn]] <- readOGR("unzipped",fn)
  }
}

###SCRAP
plot(rbind(shps$tl_2015_01_tract,shps$tl_2015_02_tract))

shp1 <- shps$tl_2015_01_tract

plot(shps[[1]][1:100,c("TRACTCE")])
###OLD CODE from job proximity paper

geo <- readOGR("/home/alec/Dev/Data/JobProximityData/Interactive","Export_Output")
#geo <- readShapeSpatial("/home/alec/Dev/Data/JobProximityData/Interactive/tracts",delete_null_obj=TRUE,proj4string=CRS("+proj=longlat +datum=WGS84"))
placeLookup <- geo@data[geo@data$city==1,]
placeLookup <- unique(placeLookup[c("stplfips","place")])

#remove states from the place names
states <- readLines("/home/alec/Dropbox/Projects/Brookings/DataViz/JobProximity/data/csv/StateNames.txt")
stateReg <- paste(" *(city)*, *",states,sep="",collapse="|")
placeLookup$PLACESHORT <- sub(stateReg,"",as.character(placeLookup$place)) 

placeLookup <- structure(as.list(placeLookup$PLACESHORT),.Names=as.character(placeLookup$stplfips))

cbsas <- levels(geo@data$cbsa)

makeWriteShp <- function(cbsa){
  cbsa <- as.character(cbsa)
  g <- geo[as.character(geo@data$cbsa)==cbsa & !is.na(geo@data$cbsa),]
  writeOGR(g, "/home/alec/Dev/Data/JobProximityData/Interactive/shapefiles", cbsa, driver="ESRI Shapefile")
}

for(c in cbsas){
  makeWriteShp(c)
}

#DATA EXPLORATION
tData <- read.csv("tracts.csv")

DC <- tData[tData$cbsa==47900 & !is.na(tData$cbsa),]
DCmm00 <- DC[DC$majmin00==1 & !is.na(DC$majmin00),]
DCmm00$wgt <- with(DCmm00,jobs00*(pop00/sum(pop00)))
sum(DCmm00$wgt)
DCmm13 <- DC[DC$majmin13==1 & !is.na(DC$majmin13),]
DCmm13$wgt <- with(DCmm13,jobs12*(pop13/sum(pop13)))
sum(DCmm13$wgt)
nrow(DCmm13[DCmm13$jobschange<0,])

sum(DCmm00$pop00)/sum(DC$pop00)
sum(DCmm13$pop13)/sum(DC$pop13)
