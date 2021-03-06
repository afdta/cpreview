#!/usr/bin/env bash

for var in 10420 10580 10740 10900 12060 12260 12420 12540 12580 12940 13820 14260 14460 14860 15380 15980 16700 16740 16860 16980 17140 17460 17820 17900 18140 19100 19380 19660 19740 19780 19820 21340 23420 24340 24660 24860 25420 25540 26420 26900 27140 27260 28140 28940 29460 29820 30780 31080 31140 31540 32580 32820 33100 33340 33460 34980 35300 35380 35620 35840 36260 36420 36540 36740 37100 37340 37980 38060 38300 38900 39300 39340 39580 40060 40140 40380 40900 41180 41620 41700 41740 41860 41940 42540 42660 44060 44140 44700 45060 45300 45780 46060 46140 46520 47260 47900 48620 49180 49340 49660
do 
../node_modules/.bin/topojson -o ../geojson/2010/$var.json \
--id-property tract -q 1e6 --simplify 0.17 --filter none --projection 'd3.geo.albersUsa()' --height 650 --width 950 -p \
-- tracts=/home/alec/Data/tiger-line/cbsa_shps10/$var.shp

../node_modules/.bin/topojson -o ../geojson/2000/$var.json \
--id-property tract -q 1e6 --simplify 0.17 --filter none --projection 'd3.geo.albersUsa()' --height 650 --width 950 -p \
-- tracts=/home/alec/Data/tiger-line/cbsa_shps00/$var.shp
done

#removed the -p args below -- just keep all features
#-p CBSA=cbsa,CITY=city,PLID=stplfips,POP13=pop13,JOBS00=jobs00,JOBS12=jobs12,CH=jobschange,MINSH=minshare13,POVSH=povrate13 \