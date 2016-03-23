d1 <- read.csv("~/Projects/Brookings/concentrated-poverty/data/source/Metro data - levels.csv", stringsAsFactors=FALSE)
d2 <- read.csv("~/Projects/Brookings/concentrated-poverty/data/source/Metro data - changes.csv", stringsAsFactors=FALSE)

d1$groups <- sub("Non-Hispanic White", "White", d1$group)
d1$yr <- sub("-","_",d1$year)

d2$groups <- sub("Non-Hispanic White", "White", d2$group)

unique(d1[d1$groups != d1$group, c("group","groups")])
unique(d2[d2$groups != d2$group, c("group","groups")])
unique(d1[d1$year != d1$yr, c("year","yr")])

#tweak names
nm <- names(d1)
nms <- c("cbsa", "metro", "geotype", "group", "year", "poor", "poor20", 
         "poor20sh", "poor40", "poor40sh", 
         "groups", "yr")
for(i in 1:length(nm)){
  cat(nm[i])
  cat(" == ")
  cat(nms[i])
  cat("\n")
}

names(d1) <- nms

#output
write.csv(d1[c("cbsa","geotype","groups","yr","poor","poor20","poor20sh","poor40","poor40sh")],
          file="/home/alec/Projects/Brookings/concentrated-poverty/data/CPLevels.csv", row.names=FALSE)

#tweak names on d2
nm2 <- names(d2)
nms2 <- gsub("X_20plus_share","sh20", nm2)
nms2 <- gsub("X_40plus_share","sh40", nms2)
nms2 <- gsub("_sig","s",nms2)

for(i in 1:length(nm2)){
  cat(nm2[i])
  cat(" == ")
  cat(nms2[i])
  cat("\n")
}

d2[d2=="Increase"] <- 1
d2[d2=="Decrease"] <- -1
d2[d2=="No Change"] <- 0

names(d2) <- nms2

#output
write.csv(d2[c("cbsa", "geotype", "groups", "sh20_00to0509", "sh20_00to0509s", 
               "sh20_0509to1014", "sh20_0509to1014s", "sh20_00to1014", "sh20_00to1014s", 
               "sh40_00to0509", "sh40_00to0509s", "sh40_0509to1014", "sh40_0509to1014s", 
               "sh40_00to1014", "sh40_00to1014s")],
          file="/home/alec/Projects/Brookings/concentrated-poverty/data/CPChanges.csv", row.names=FALSE)

library("reshape2")

d3 <- melt(data = d2, id.vars = c("cbsa","geotype","groups"), measure.vars = c("sh20_00to0509", "sh20_0509to1014", "sh40_00to0509", "sh40_0509to1014", 
                                                                               "sh20_00to0509s", "sh20_0509to1014s", "sh40_00to0509s", "sh40_0509to1014s"))
d3$value2 <- as.numeric(d3$value)
d3$share <- substring(d3$variable, 1, 4)
d3$share <- ifelse(d3$share=="sh20", "poor20sh", ifelse(d3$share=="sh40", "poor40sh", NA))
d3$yr <- gsub("s|sh20_|sh40_", "", d3$variable)

#http://stackoverflow.com/questions/7963898/extracting-the-last-n-characters-from-a-string-in-r
substrRight <- function(x, n){
  return(substr(x, nchar(x)-n+1, nchar(x)))
}
d3$issig <- ifelse(substrRight(as.character(d3$variable), 1)=="s", "s", "v")

d4 <- dcast(d3, cbsa + geotype + groups + yr ~ share + issig, value.var="value2")

nm4 <- names(d4)
nms4 <- c("cbsa", "geotype", "groups", "yr", "poor20shsig", "poor20sh", "poor40shsig", "poor40sh")
names(d4) <- nms4

d1$poor20shsig <- NA
d1$poor40shsig <- NA

d5 <- rbind(d4, d1[c("cbsa", "geotype", "groups", "yr", "poor20sh", "poor40sh", "poor20shsig", "poor40shsig")])

write.csv(d5,file="/home/alec/Projects/Brookings/concentrated-poverty/data/CPMetro.csv", row.names=FALSE)

d5split <- split(d5, list(d5$geotype, d5$groups, d5$yr))
d5split2 <- split(d5, list(d5$yr))
sapply(d5split, function(e){
  st = paste(e[1,"geotype"],"|",e[1,"groups"],"|",e[1,"yr"],"20%:",range(e$poor20sh)[1],range(e$poor20sh)[2],"40%:",range(e$poor40sh)[1],range(e$poor40sh)[2])
  return(st)
})

sapply(d5split2, function(e){
  st = paste(e[1,"yr"],"20%:",range(e$poor20sh)[1],range(e$poor20sh)[2],"40%:",range(e$poor40sh)[1],range(e$poor40sh)[2])
  return(st)
})

##########################################

#EXPLORE
library("ggplot2")
library("metromonitor")
all <- merge(d[d$geotype=="Metro" & d$groups=="All" & d$yr=="2010_14", ], 
             metropops(TRUE, "2013")[c("CBSA_Code", "CBSA_Title", "lon", "lat")], by.x="cbsa", by.y="CBSA_Code")


gg <- ggplot(all, aes(x=lon, y=lat))
gg + geom_point(aes(size=poor20sh))
