#!/usr/bin/env Rscript
# Reproducible data preparation for the Oxfordshire-to-Uxbridge Uptake Modelling Case Study.
# Extracts compact, self-contained datasets into docs/data/ so `quarto render docs`
# runs cleanly on dev, CI, and production without requiring the full /data lake.
#
# Optional environment variables:
#   RAILACTIVE_CORRIDOR_PATH  - path to north_south_corridor_v2.json
#   RAILACTIVE_DATA_DIR       - root analytical data lake directory (default: /data)
#   RAILACTIVE_DOCS_DATA_DIR  - output directory for docs datasets (default: docs/data)

library(sf)
library(dplyr)
library(readr)
library(tidyr)

data_dir <- Sys.getenv("RAILACTIVE_DATA_DIR", unset = "/data")
corridor_path <- Sys.getenv(
  "RAILACTIVE_CORRIDOR_PATH",
  unset = file.path(data_dir, "silver/railactive/north_south_corridor_v2.json")
)
if (!file.exists(corridor_path)) {
  stop("Corridor file not found: ", corridor_path,
       "\nSet RAILACTIVE_CORRIDOR_PATH to north_south_corridor_v2.json.")
}

pwc_path <- file.path(data_dir, "bronze/ons/lsoa-2011-pwc/lsoa11_pwc.csv")
bua_path <- file.path(data_dir, "bronze/ons_bua/bua_2022_gb.geojson")
lad_path <- file.path(data_dir, "bronze/ons/ref/lad_gb.geojson")
pct_dir  <- file.path(data_dir, "bronze/ngo/pct/lsoa-od-2011")

out_dir <- Sys.getenv("RAILACTIVE_DOCS_DATA_DIR", unset = if (dir.exists("docs/data")) "docs/data" else "data")
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

# 1. Corridor geometry: Oxfordshire (Banbury, Sec 13) to Uxbridge (Hillingdon, Sec 11)
secs_ordered <- c("13", "10", "8", "7", "6", "5", "4", "3", "2", "1", "12", "11")
g <- st_read(corridor_path, quiet = TRUE)
corr <- g |>
  filter(layer_type == "active_route", status == "preferred", section %in% secs_ordered) |>
  select(id, name, link_id, section, category, classification, setting, length_km, folder) |>
  mutate(section = factor(section, levels = secs_ordered))

corr_27700 <- st_transform(corr, 27700)
corr_union <- st_union(corr_27700)

# Simplify lightly (15 m tolerance) for compact docs/data GeoJSON
corr_simp <- corr_27700 |>
  st_simplify(dTolerance = 15, preserveTopology = TRUE) |>
  st_transform(4326) |>
  mutate(section = as.character(section))
st_write(corr_simp, file.path(out_dir, "ox_ux_corridor.geojson"), delete_dsn = TRUE, quiet = TRUE)

# Corridor section & classification summary
lad <- st_read(lad_path, quiet = TRUE) |> st_transform(27700)
corr_cents <- st_centroid(corr_27700)
corr_lad <- st_join(corr_cents, lad |> select(LAD24NM)) |> st_drop_geometry()

sec_summary <- corr_lad |>
  mutate(section = factor(section, levels = secs_ordered)) |>
  group_by(section) |>
  summarise(
    n_links = n(),
    length_km = round(sum(length_km, na.rm = TRUE), 2),
    local_authorities = paste(unique(na.omit(LAD24NM)), collapse = ", "),
    pct_offroad_or_tcr = round(100 * sum(length_km[classification %in% c(
      "Repurposed HS2 TCR", "New Greenway", "HS2 delivered greenway",
      "Upgrade PROW", "Canal Towpath Upgrade", "Main Road-Cycle tracks"
    )], na.rm = TRUE) / sum(length_km, na.rm = TRUE), 1),
    .groups = "drop"
  ) |>
  arrange(section)
write_csv(sec_summary, file.path(out_dir, "ox_ux_section_summary.csv"))

class_summary <- corr |>
  st_drop_geometry() |>
  group_by(classification) |>
  summarise(
    n_links = n(),
    length_km = round(sum(length_km, na.rm = TRUE), 2),
    .groups = "drop"
  ) |>
  mutate(share_pct = round(100 * length_km / sum(length_km), 1)) |>
  arrange(desc(length_km))
write_csv(class_summary, file.path(out_dir, "ox_ux_classification_summary.csv"))

# 2. Key settlements (BUA 2022) for map labelling
bua <- st_read(bua_path, quiet = TRUE) |> st_transform(27700)
key_towns <- c(
  "Banbury", "Brackley", "Buckingham", "Aylesbury", "Wendover",
  "Prestwood and Great Missenden", "Amersham", "Chalfont St Peter",
  "Denham", "Hillingdon"
)
towns_sf <- bua |>
  filter(BUA22NM %in% key_towns) |>
  st_centroid() |>
  st_transform(4326)
town_coords <- st_coordinates(towns_sf)
towns_df <- tibble(
  name = towns_sf$BUA22NM,
  label = case_when(
    name == "Hillingdon" ~ "Uxbridge",
    name == "Prestwood and Great Missenden" ~ "Great Missenden",
    TRUE ~ name
  ),
  lon = ifelse(name == "Hillingdon", -0.479, town_coords[, 1]),
  lat = ifelse(name == "Hillingdon", 51.546, town_coords[, 2])
)
write_csv(towns_df, file.path(out_dir, "ox_ux_settlements.csv"))

# 3. 2011 Census LSOA OD Commute Data (PCT) along the Oxfordshire-Uxbridge corridor
pwc <- read_csv(pwc_path, show_col_types = FALSE)
pwc_sf <- st_as_sf(pwc, coords = c("lon", "lat"), crs = 4326) |> st_transform(27700)
pwc_xy <- st_coordinates(pwc_sf)
pwc$x <- pwc_xy[, 1]
pwc$y <- pwc_xy[, 2]
pwc$dist_to_corr_m <- as.numeric(st_distance(pwc_sf, corr_union))

near_bua_idx <- st_nearest_feature(pwc_sf, bua)
pwc$nearest_bua <- bua$BUA22NM[near_bua_idx]

near_sec_idx <- st_nearest_feature(pwc_sf, corr_27700)
pwc$nearest_section <- as.character(corr$section[near_sec_idx])

pct_files <- file.path(
  pct_dir,
  paste0(c("oxfordshire", "buckinghamshire", "london", "hertfordshire", "northamptonshire", "berkshire"), ".csv")
)
od <- bind_rows(lapply(pct_files, function(f) {
  read_csv(
    f,
    col_select = c(
      geo_code1, geo_code2, geo_name1, geo_name2, lad_name1, lad_name2,
      all, bicycle, foot, car_driver, car_passenger, motorbike, train_tube, bus, taxi_other,
      govtarget_slc, dutch_slc, ebike_slc,
      e_dist_km, rf_dist_km, rq_dist_km, rf_avslope_perc, rf_time_min
    ),
    show_col_types = FALSE
  )
})) |>
  distinct(geo_code1, geo_code2, .keep_all = TRUE)

od_corr <- od |>
  inner_join(
    pwc |> select(geo_code1 = code, ox = x, oy = y, olon = lon, olat = lat,
                  o_dist_m = dist_to_corr_m, o_bua = nearest_bua, o_sec = nearest_section),
    by = "geo_code1"
  ) |>
  inner_join(
    pwc |> select(geo_code2 = code, dx = x, dy = y, dlon = lon, dlat = lat,
                  d_dist_m = dist_to_corr_m, d_bua = nearest_bua, d_sec = nearest_section),
    by = "geo_code2"
  ) |>
  filter(o_dist_m <= 3000, d_dist_m <= 3000, rf_dist_km <= 20, geo_code1 != geo_code2)

corr_buf1500 <- st_buffer(corr_union, 1500)
od_lines <- st_sfc(lapply(seq_len(nrow(od_corr)), function(i) {
  st_linestring(matrix(c(od_corr$ox[i], od_corr$dx[i], od_corr$oy[i], od_corr$dy[i]), ncol = 2))
}), crs = 27700)
line_len <- as.numeric(st_length(od_lines))
inter <- st_intersection(st_sf(idx = seq_len(nrow(od_corr)), geometry = od_lines), corr_buf1500)
inter_len <- numeric(nrow(od_corr))
inter_len[inter$idx] <- as.numeric(st_length(inter))

od_corr <- od_corr |>
  mutate(
    prop_within_1500m = round(ifelse(line_len > 0, inter_len / line_len, 0), 3),
    access_decay = exp(-(o_dist_m + d_dist_m) / 3000),
    omega_corr = round(pmin(1, prop_within_1500m * access_decay), 4),
    is_core_aligned = (o_dist_m <= 1500 & d_dist_m <= 1500 & prop_within_1500m >= 0.70 & rf_dist_km >= 1.5),
    corr_central_slc = round(pmin(all, bicycle + pmax(0, dutch_slc - bicycle) * 0.50 * omega_corr), 3),
    corr_high_slc    = round(pmin(all, bicycle + pmax(0, ebike_slc - bicycle) * 0.60 * omega_corr), 3),
    o_dist_m = round(o_dist_m, 0),
    d_dist_m = round(d_dist_m, 0),
    olon = round(olon, 5), olat = round(olat, 5),
    dlon = round(dlon, 5), dlat = round(dlat, 5),
    govtarget_slc = round(govtarget_slc, 3),
    dutch_slc = round(dutch_slc, 3),
    ebike_slc = round(ebike_slc, 3)
  ) |>
  select(-ox, -oy, -dx, -dy, -access_decay)

write_csv(od_corr, file.path(out_dir, "ox_ux_od_2011.csv"))

# Print concise verification summary
cat("=== Saved docs/data/ files ===\n")
cat("Corridor features:", nrow(corr_simp), "| Length (km):", round(sum(corr_simp$length_km), 2), "\n")
cat("3 km catchment inter-LSOA OD pairs:", nrow(od_corr), "| Total commuters:", sum(od_corr$all), "\n")
cat("  Baseline cyclists:", sum(od_corr$bicycle), sprintf("(%.2f%%)\n", 100 * sum(od_corr$bicycle) / sum(od_corr$all)))
cat("  GovTarget cyclists:", round(sum(od_corr$govtarget_slc)), sprintf("(%.2f%%)\n", 100 * sum(od_corr$govtarget_slc) / sum(od_corr$all)))
cat("  Corridor Central (attenuated):", round(sum(od_corr$corr_central_slc)), sprintf("(%.2f%%, +%d new)\n",
    100 * sum(od_corr$corr_central_slc) / sum(od_corr$all), round(sum(od_corr$corr_central_slc - od_corr$bicycle))))
cat("  Corridor High (E-bike attenuated):", round(sum(od_corr$corr_high_slc)), sprintf("(%.2f%%, +%d new)\n",
    100 * sum(od_corr$corr_high_slc) / sum(od_corr$all), round(sum(od_corr$corr_high_slc - od_corr$bicycle))))
cat("  Go Dutch (unattenuated ceiling):", round(sum(od_corr$dutch_slc)), sprintf("(%.2f%%)\n", 100 * sum(od_corr$dutch_slc) / sum(od_corr$all)))
cat("  E-bikes (unattenuated ceiling):", round(sum(od_corr$ebike_slc)), sprintf("(%.2f%%)\n", 100 * sum(od_corr$ebike_slc) / sum(od_corr$all)))

core <- od_corr |> filter(is_core_aligned)
cat("\nCore corridor-aligned pairs (<=1.5km, >=70% aligned, >=1.5km dist):", nrow(core), "| Commuters:", sum(core$all), "\n")
cat("  Baseline cyclists:", sum(core$bicycle), sprintf("(%.2f%%)\n", 100 * sum(core$bicycle) / sum(core$all)))
cat("  Corridor Central:", round(sum(core$corr_central_slc)), sprintf("(%.2f%%, +%d new)\n",
    100 * sum(core$corr_central_slc) / sum(core$all), round(sum(core$corr_central_slc - core$bicycle))))
cat("  Go Dutch:", round(sum(core$dutch_slc)), sprintf("(%.2f%%)\n", 100 * sum(core$dutch_slc) / sum(core$all)))
