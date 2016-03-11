d <- read.csv("~/Projects/Brookings/concentrated-poverty/data/source/metroInteractiveReshape.csv", stringsAsFactors=FALSE)

d$groups <- sub("Non-Hispanic White", "White", d$group)
d$yr <- sub("-","_",d$year)

unique(d[d$groups != d$group, c("group","groups")])
unique(d[d$year != d$yr, c("year","yr")])

nm <- names(d)
nms <- c("cbsa", "metro", "geotype", "group", "year", "poor", "poor20", 
         "poor20sh", "poor40", "poor40sh", 
         "groups", "yr")
for(i in 1:length(nm)){
  cat(nm[i])
  cat(" == ")
  cat(nms[i])
  cat("\n")
}

names(d) <- nms

write.csv(d[c("cbsa","metro","geotype","groups","yr","poor","poor20","poor20sh","poor40","poor40sh")],
          file="/home/alec/Projects/Brookings/concentrated-poverty/data/poor.csv", row.names=FALSE)