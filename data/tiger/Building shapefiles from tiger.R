library("rgdal")
library("jsonlite")
library("metromonitor")

files <- c("tl_2010_01_tract10.zip", "tl_2010_02_tract10.zip", "tl_2010_04_tract10.zip", 
           "tl_2010_05_tract10.zip", "tl_2010_06_tract10.zip", "tl_2010_08_tract10.zip", 
           "tl_2010_09_tract10.zip", "tl_2010_10_tract10.zip", "tl_2010_11_tract10.zip", 
           "tl_2010_12_tract10.zip", "tl_2010_13_tract10.zip", "tl_2010_15_tract10.zip", 
           "tl_2010_16_tract10.zip", "tl_2010_17_tract10.zip", "tl_2010_18_tract10.zip", 
           "tl_2010_19_tract10.zip", "tl_2010_20_tract10.zip", "tl_2010_21_tract10.zip", 
           "tl_2010_22_tract10.zip", "tl_2010_23_tract10.zip", "tl_2010_24_tract10.zip", 
           "tl_2010_25_tract10.zip", "tl_2010_26_tract10.zip", "tl_2010_27_tract10.zip", 
           "tl_2010_28_tract10.zip", "tl_2010_29_tract10.zip", "tl_2010_30_tract10.zip", 
           "tl_2010_31_tract10.zip", "tl_2010_32_tract10.zip", "tl_2010_33_tract10.zip", 
           "tl_2010_34_tract10.zip", "tl_2010_35_tract10.zip", "tl_2010_36_tract10.zip", 
           "tl_2010_37_tract10.zip", "tl_2010_38_tract10.zip", "tl_2010_39_tract10.zip", 
           "tl_2010_40_tract10.zip", "tl_2010_41_tract10.zip", "tl_2010_42_tract10.zip", 
           "tl_2010_44_tract10.zip", "tl_2010_45_tract10.zip", "tl_2010_46_tract10.zip", 
           "tl_2010_47_tract10.zip", "tl_2010_48_tract10.zip", "tl_2010_49_tract10.zip", 
           "tl_2010_50_tract10.zip", "tl_2010_51_tract10.zip", "tl_2010_53_tract10.zip", 
           "tl_2010_54_tract10.zip", "tl_2010_55_tract10.zip", "tl_2010_56_tract10.zip")

f2 <- sub("tract10","tract",files)
f2 <- sub("2010","2014",f2)

shps <- list()
setwd("/home/alec/Data/tiger-line")
existing <- list.files()
dir <- "ftp://ftp2.census.gov/geo/tiger/TIGER2014/TRACT/" 
for(f in f2){
  fn <- sub("\\.zip","",f)
  
  if(!(f %in% existing)){
    cat(paste("Downloading",f,"\n"))
    download.file(paste0(dir,f), f, method="wget", quiet=TRUE)
  } else{
    cat("File already downloaded... \n")
  }
  
  unzip(f, exdir="unzipped") #need to create the unzipped dir prior to running this
  
  tmpshp <- readOGR("unzipped", fn)
  shps[[fn]] <- spChFIDs(tmpshp, as.character(tmpshp$GEOID)) #set new polygon id
  
  if(sum(sapply(shps[[fn]]@polygons, function(e){return(e@ID)}) == rownames(shps[[fn]]@data)) != length(shps[[fn]]) ){
    warning("New labels do not equal row names")
  }
  rm(fn,tmpshp)
}
rm(f,dir)

shapes <- do.call("rbind",shps)

#check
sum(shapes$GEOID == paste0(shapes$STATEFP,shapes$COUNTYFP,shapes$TRACTCE)) == length(shapes)

#create a clean spatial polygons object
Sr <- SpatialPolygons(shapes@polygons, proj4string=shapes@proj4string)

#import data
tractDTA <- read.csv("/home/alec/Projects/Brookings/concentrated-poverty/data/source/2000, 2010-14 tracts for interactive.csv",
                     colClasses=c(tract="character", cbsa="character"),
                     stringsAsFactors=FALSE)

newnames <- c("tract", "exclude", "supp", "cbsa", "metro", "city", "plfips", "place", "poor00", "pov00", "poor1014", "pov1014", "chpoor", "chpoorS", "chpov", "chpovS")
names(tractDTA) <- newnames

rownames(tractDTA) <- tractDTA$tract

allshp <- SpatialPolygonsDataFrame(Sr, tractDTA[c("tract","exclude","supp","cbsa","city","plfips","pov00","pov1014")], match.ID = TRUE)
length(allshp)

allshp2 <- allshp[allshp@data$exclude==0 & allshp@data$supp==0, ]
length(allshp2)

#basic check
ID1 <- sapply(Sr@polygons,function(e){return(e@ID)})
ID2 <- rownames(tractDTA)
ID2[!(ID2 %in% ID1)]
ID1[!(ID1 %in% ID2)]

cbsas <- unique(allshp2@data[c("cbsa")])
t100 <- metropops(TRUE, "2013")
cbsa100 <- merge(cbsas, t100[c("CBSA_Code","CBSA_Title")], by.x="cbsa", by.y="CBSA_Code")

makeWriteShp <- function(cbsa){
  g <- allshp2[as.character(allshp2@data$cbsa)==cbsa & !is.na(allshp2@data$cbsa),]
  writeOGR(g, "/home/alec/Data/tiger-line/cbsa_shps10", cbsa, driver="ESRI Shapefile")
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
