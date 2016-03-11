library("rgdal")
library("jsonlite")
library("metromonitor")
library("ggmap")

shape <- readOGR("/home/alec/Data/concentrated-poverty-shapes/2009 tract shapefile/","tracts")

#TO DO - SET STCOTRACT as ID
shp <- spChFIDs(shape, as.character(shape$FIPS)) 

#create a clean spatial polygons object
Sr <- SpatialPolygons(shp@polygons, proj4string=shp@proj4string)

#import data
tractDTA <- read.csv("/home/alec/Projects/Brookings/concentrated-poverty/data/source/2005-09 tracts for interactive.csv",
                     colClasses=c(tract="character", cbsa="character"),
                     stringsAsFactors=FALSE)

newnames <- c("tract", "exclude", "supp", "cbsa", "metro", "city", "poor0509", "pov0509")
names(tractDTA) <- newnames

rownames(tractDTA) <- tractDTA$tract

##Subset shapefile
y <- shp@data$FIPS %in% tractDTA$tract
yes <- shp[y, "TRACT"]
n <- !(shp@data$FIPS %in% tractDTA$tract)
no <- shp[n, "TRACT"]

##Subset data
nind <- tractDTA[!(tractDTA$tract %in% shp@data$FIPS), ]
yind <- tractDTA[(tractDTA$tract %in% shp@data$FIPS), ]
write.csv(nind, "~/Desktop/InDataSheet_NotInShapefile.csv",row.names = FALSE)

##Make new shape with just overlapping data
innerPoly <- SpatialPolygons(yes@polygons, proj4string=yes@proj4string)
innershp <- SpatialPolygonsDataFrame(innerPoly, yind, match.ID = TRUE)

#San Antonio
SA <- innershp[innershp@data$cbsa=="41700", ]

#Dubuque
DU <- innershp[innershp@data$cbsa=="20220", ]
DUF <- fortify(DU)

IA <- innershp[substring(innershp@data$tract, 1, 2)=="19", ]
IA2 <- shape[substring(shape@data$FIPS, 1, 2)=="19", ]

#Source: http://spatioanalytics.com/2013/07/12/throw-some-throw-some-stats-on-that-map-part-1/
CenterOfMap <- geocode("Dubuque, IA")
Dubuque <- get_map(c(lon=CenterOfMap$lon, lat=CenterOfMap$lat),zoom = 9, maptype = "terrain", source = "google")
Dumap <- ggmap(Dubuque)

Dumap + geom_polygon(aes(x=long, y=lat, group=group), fill='grey', size=.2,color='green', data=DUF, alpha=0.8)

allshp <- SpatialPolygonsDataFrame(Sr, tractDTA, match.ID = TRUE)
length(allshp)

#basic check
ID1 <- sapply(Sr@polygons,function(e){return(e@ID)})
ID2 <- rownames(tractDTA)
ID2[!(ID2 %in% ID1)]
ID1[!(ID1 %in% ID2)]

cbsas <- unique(allshp@data[c("cbsa","metro")])
t100 <- metropops(TRUE, "2013")
cbsa100 <- merge(cbsas, t100[c("CBSA_Code","CBSA_Title")], by.x="cbsa", by.y="CBSA_Code")
sum(cbsa100$metro == cbsa100$CBSA_Title)

makeWriteShp <- function(cbsa){
  g <- allshp[as.character(allshp@data$cbsa)==cbsa & !is.na(allshp@data$cbsa),]
  writeOGR(g, "cbsa_shps", cbsa, driver="ESRI Shapefile")
}

for(c in cbsa100$cbsa){
  makeWriteShp(c)
}

#generate string for shell script
paste(cbsa100$cbsa, "", sep="", collapse=" ")

#################################END (CODE BELOW IS SCRAP)

"10420 10580 10740 10900 12060 12260 12420 12540 12580 12940 13820 14260 14860 15380 15980 16700 16740 16860 16980 17140 17460 17820 17900 18140 19100 19380 19660 19740 19780 19820 21340 23420 24340 24660 24860 25420 25540 26420 26900 27140 27260 28140 28940 29460 29820 30780 31080 31140 31540 32580 32820 33100 33340 33460 34980 35300 35380 35620 35840 36260 36420 36540 36740 37100 37340 37980 38060 38300 38900 39340 39580 40060 40140 40380 40900 41180 41620 41700 41740 41860 41940 42540 42660 44060 44700 45060 45300 45780 46060 46140 46520 47260 47900 48620 49180 49660"

length(Sr)
nrow(tractDTA)

#merge on data
shapesMerged <- merge(shapesTrimmed, tractDTA, by.x="GEOID", by.y="tract")
IDS <- sapply(shapesMerged@polygons,function(e){return(e@ID)})
RNS <-rownames(shapesMerged@data$GEOID)
sum(IDS==RNS)


###SCRAP
download.file("ftp://ftp2.census.gov/geo/tiger/TIGER2014/TRACT/tl_2014_01_tract.zip", "tl_2014_01_tract.zip", method="wget", quiet=FALSE)
plot(rbind(shps$tl_2015_01_tract,shps$tl_2015_02_tract))
t <- "tl_2015_60_tract.zip"
as.numeric(gsub("tl_2015_|_tract","","tl_2015_60_tract")) == 60
newids <- spChFIDs(shps[[1]],as.character(shps[[1]]$GEOID))
head(newids@data)
sum(sapply(newids@polygons, function(e){return(e@ID)}) == rownames(newids@data)) == length(newids)
shapes <- rbind(shps$tl_2015_01_tract,shps$tl_2015_02_tract,shps$tl_2015_04_tract)
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
