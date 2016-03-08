library("rgdal")
library("maptools")
library("rgeos")
library("jsonlite")
library("metromonitor")
library("ggplot2")

setwd("/home/alec/Data/tiger-line/cbsa_shps")


dc <- readOGR(".", "47900")
dcdf <- fortify(dc, region="tract")
dcdf2 <- merge(dcdf, dc@data, by.x="id", by.y="tract")

which(is.na(dc@data$pov1014))
badtract <- dc@data[dc@data$tract=="51107980100", ]

gg <- ggplot(dcdf2, aes(x=long, y=lat, group=group))
gg + geom_polygon(aes(fill=pov1014))

makeWriteShp <- function(cbsa){
  g <- allshp[as.character(allshp@data$cbsa)==cbsa & !is.na(allshp@data$cbsa),]
  writeOGR(g, "cbsa_shps", cbsa, driver="ESRI Shapefile")
}

#Notes
#see https://github.com/hadley/ggplot2/wiki/plotting-polygon-shapefiles