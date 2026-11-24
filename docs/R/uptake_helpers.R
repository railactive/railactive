# Shared data, calculation, plotting, and table helpers for RailActive uptake docs.

suppressPackageStartupMessages({
  library(sf)
  library(dplyr)
  library(readr)
  library(tidyr)
  library(ggplot2)
  library(scales)
  library(knitr)
  library(patchwork)
})

#' Consistent publication ggplot2 theme across HTML, PDF, and DOCX outputs.
theme_rail <- function(base_size = 10) {
  theme_minimal(base_size = base_size) +
    theme(
      plot.title = element_text(face = "bold", colour = "#0f172a", size = base_size + 1.5),
      plot.subtitle = element_text(colour = "#475569", size = base_size - 0.5),
      panel.grid.minor = element_blank(),
      legend.title = element_text(face = "bold", size = base_size - 1),
      legend.text = element_text(size = base_size - 1.5),
      strip.text = element_text(face = "bold", colour = "#0f172a")
    )
}

#' Bass diffusion cumulative adoption curve r(t) in [0, 1].
bass_curve <- function(t, p, q) {
  (1 - exp(-(p + q) * t)) / (1 + (q / p) * exp(-(p + q) * t))
}

#' Discrete convolution of annual behavioural adoption cohorts with AMAT's 5-year health lag.
convolve_health <- function(r) {
  dr <- c(r[1], diff(r))
  he <- numeric(length(r))
  for (k in seq_along(r)) {
    for (j in seq_len(k)) {
      he[k] <- he[k] + dr[j] * min(1.0, (k - j + 1) * 0.2)
    }
  }
  he
}

#' Simplify raw corridor classifications into five clean cartographic groups.
simplify_corridor_classes <- function(corr) {
  levels_cls <- c(
    "Repurposed HS2 TCR / Greenway",
    "New Greenway / Cycle Track",
    "Upgraded PRoW / Canal Towpath",
    "Quietway / Quiet Lane",
    "Existing Routes"
  )
  corr |>
    mutate(
      cls_grp = case_when(
        classification %in% c("Repurposed HS2 TCR", "HS2 delivered greenway") ~ "Repurposed HS2 TCR / Greenway",
        classification %in% c("New Greenway", "Main Road-Cycle tracks") ~ "New Greenway / Cycle Track",
        classification %in% c("Upgrade PROW", "Canal Towpath Upgrade") ~ "Upgraded PRoW / Canal Towpath",
        classification %in% c("Local Road Quietway", "Quiet Lane") ~ "Quietway / Quiet Lane",
        TRUE ~ "Existing Routes"
      ),
      cls_grp = factor(cls_grp, levels = levels_cls)
    )
}

CORRIDOR_PALETTE <- c(
  "Repurposed HS2 TCR / Greenway" = "#d97706",
  "New Greenway / Cycle Track"    = "#059669",
  "Upgraded PRoW / Canal Towpath" = "#0284c7",
  "Quietway / Quiet Lane"         = "#7c3aed",
  "Existing Routes"               = "#64748b"
)

#' Load all Oxfordshire-Uxbridge case study datasets and precompute headline statistics.
load_uptake_data <- function(data_dir = "data") {
  corr      <- st_read(file.path(data_dir, "ox_ux_corridor.geojson"), quiet = TRUE)
  od        <- read_csv(file.path(data_dir, "ox_ux_od_2011.csv"), show_col_types = FALSE)
  sec_sum   <- read_csv(file.path(data_dir, "ox_ux_section_summary.csv"), show_col_types = FALSE)
  class_sum <- read_csv(file.path(data_dir, "ox_ux_classification_summary.csv"), show_col_types = FALSE)
  towns     <- read_csv(file.path(data_dir, "ox_ux_settlements.csv"), show_col_types = FALSE)
  amat_base <- read_csv(file.path(data_dir, "ox_ux_amat_summary.csv"), show_col_types = FALSE)

  core <- od |> filter(is_core_aligned)
  ex_main <- od |> filter(geo_code1 == "E01027288", geo_code2 == "E01028435")

  ex_four <- od |>
    filter(
      (geo_code1 == "E01027288" & geo_code2 == "E01028435") |
      (geo_code1 == "E01017630" & geo_code2 == "E01032955") |
      (geo_code1 == "E01017728" & geo_code2 == "E01032955") |
      (geo_code1 == "E01017813" & geo_code2 == "E01033725")
    ) |>
    mutate(
      corridor_pair = case_when(
        geo_code1 == "E01027288" ~ "King's Sutton -> Banbury (Oxon)",
        geo_code1 == "E01017630" ~ "Weston Turville -> Aylesbury (Bucks)",
        geo_code1 == "E01017728" ~ "Wendover -> Aylesbury (Bucks)",
        geo_code1 == "E01017813" ~ "Denham -> Uxbridge (Colne Valley)"
      )
    ) |>
    arrange(desc(olat))

  offroad_classes <- c(
    "Repurposed HS2 TCR", "HS2 delivered greenway", "Upgrade PROW",
    "New Greenway", "Canal Towpath Upgrade", "Main Road-Cycle tracks"
  )
  offroad_km <- sum(class_sum$length_km[class_sum$classification %in% offroad_classes], na.rm = TRUE)
  tot_len_km <- round(sum(corr$length_km, na.rm = TRUE), 1)
  offroad_pct <- round(100 * offroad_km / sum(class_sum$length_km, na.rm = TRUE), 1)

  # Catchment totals
  n_pairs_3km  <- nrow(od)
  tot_comm_3km <- sum(od$all)
  base_cyc_3km <- sum(od$bicycle)
  gt_cyc_3km   <- sum(od$govtarget_slc)
  cc_cyc_3km   <- sum(od$corr_central_slc)
  ch_cyc_3km   <- sum(od$corr_high_slc)
  du_cyc_3km   <- sum(od$dutch_slc)
  eb_cyc_3km   <- sum(od$ebike_slc)

  n_pairs_core  <- nrow(core)
  tot_comm_core <- sum(core$all)
  base_cyc_core <- sum(core$bicycle)
  gt_cyc_core   <- sum(core$govtarget_slc)
  cc_cyc_core   <- sum(core$corr_central_slc)
  ch_cyc_core   <- sum(core$corr_high_slc)
  du_cyc_core   <- sum(core$dutch_slc)
  eb_cyc_core   <- sum(core$ebike_slc)

  # Temporal adoption trajectories (40-yr ATE appraisal period, 2030-2069)
  yrs       <- 0:39
  cal_yr    <- 2030 + yrs
  t_mid     <- yrs + 0.5
  grow      <- (1.0075) ^ pmin(yrs, 20)
  disc_t    <- 1 / (1.035 ^ yrs)
  disc_h    <- 1 / (1.015 ^ yrs)
  h_lag_std <- pmin(1.0, (yrs + 1) * 0.2)

  profiles <- list(
    "Instant (AMAT Default)" = rep(1.0, 40),
    "Fast Ramp-Up (3-yr)"    = bass_curve(t_mid, p = 0.22, q = 0.70),
    "Central Ramp-Up (5-yr)" = bass_curve(t_mid, p = 0.10, q = 0.55),
    "Slow Ramp-Up (8-yr)"    = bass_curve(t_mid, p = 0.05, q = 0.35)
  )

  ex_eq_annual_trips <- ex_main$corr_central_slc * 1.9 * 220

  lag_df <- bind_rows(lapply(names(profiles), function(nm) {
    r <- profiles[[nm]]
    tibble(
      Year = cal_yr,
      Profile = nm,
      Annual_Trips = ex_eq_annual_trips * r * grow,
      Health_Eff = convolve_health(r)
    )
  })) |>
    mutate(Profile = factor(Profile, levels = names(profiles)))

  lag_pv_raw <- bind_rows(lapply(names(profiles), function(nm) {
    r <- profiles[[nm]]
    he <- convolve_health(r)
    tibble(
      Profile = nm,
      Yr1 = r[1], Yr3 = r[3], Yr5 = r[5],
      pv_t = sum(r * grow * disc_t) / sum(profiles[[1]] * grow * disc_t),
      pv_h = sum(he * grow * disc_h) / sum(h_lag_std * grow * disc_h)
    )
  }))

  pv_t_central <- lag_pv_raw$pv_t[lag_pv_raw$Profile == "Central Ramp-Up (5-yr)"]
  pv_h_central <- lag_pv_raw$pv_h[lag_pv_raw$Profile == "Central Ramp-Up (5-yr)"]

  amat_tbl <- amat_base |>
    mutate(
      pv_factor = ifelse(discount_type == "health", pv_h_central, pv_t_central),
      pvb_lag_m = pvb_instant_m * pv_factor
    )
  amat_tot_inst <- sum(amat_tbl$pvb_instant_m)
  amat_tot_lag  <- sum(amat_tbl$pvb_lag_m)
  amat_tbl <- amat_tbl |>
    mutate(share_lag_pct = 100 * pvb_lag_m / amat_tot_lag)

  ex_new_cyc <- ex_main$corr_central_slc - ex_main$bicycle
  ex_car_div_pct <- 100 * ex_main$car_driver / (ex_main$all - ex_main$bicycle)

  stats <- list(
    tot_len_km       = tot_len_km,
    n_links          = nrow(corr),
    offroad_km       = round(offroad_km, 1),
    offroad_pct      = offroad_pct,
    n_pairs_3km      = n_pairs_3km,
    tot_comm_3km     = tot_comm_3km,
    car_pct_3km      = 100 * sum(od$car_driver) / tot_comm_3km,
    walk_pct_3km     = 100 * sum(od$foot) / tot_comm_3km,
    base_cyc_3km     = base_cyc_3km,
    base_cyc_pct_3km = 100 * base_cyc_3km / tot_comm_3km,
    gt_cyc_3km       = gt_cyc_3km,
    cc_cyc_3km       = cc_cyc_3km,
    cc_new_3km       = cc_cyc_3km - base_cyc_3km,
    cc_share_3km     = 100 * cc_cyc_3km / tot_comm_3km,
    ch_cyc_3km       = ch_cyc_3km,
    du_cyc_3km       = du_cyc_3km,
    du_new_3km       = du_cyc_3km - base_cyc_3km,
    eb_cyc_3km       = eb_cyc_3km,
    n_pairs_core     = n_pairs_core,
    tot_comm_core    = tot_comm_core,
    base_cyc_core    = base_cyc_core,
    base_cyc_pct_core = 100 * base_cyc_core / tot_comm_core,
    gt_cyc_core      = gt_cyc_core,
    cc_cyc_core      = cc_cyc_core,
    cc_new_core      = cc_cyc_core - base_cyc_core,
    cc_share_core    = 100 * cc_cyc_core / tot_comm_core,
    ch_cyc_core      = ch_cyc_core,
    du_cyc_core      = du_cyc_core,
    eb_cyc_core      = eb_cyc_core,
    core_share_of_new = 100 * (cc_cyc_core - base_cyc_core) / (cc_cyc_3km - base_cyc_3km),
    core_new_trips_day = (cc_cyc_core - base_cyc_core) * 1.9,
    mean_dist_core_new = sum((core$corr_central_slc - core$bicycle) * core$rf_dist_km) /
      sum(core$corr_central_slc - core$bicycle),
    ex_n             = ex_main$all,
    ex_cyc           = ex_main$bicycle,
    ex_walk          = ex_main$foot,
    ex_car_drv       = ex_main$car_driver,
    ex_car_pax       = ex_main$car_passenger,
    ex_bus           = ex_main$bus,
    ex_rail          = ex_main$train_tube,
    ex_dist          = ex_main$rf_dist_km,
    ex_slope         = ex_main$rf_avslope_perc,
    ex_o_dist        = ex_main$o_dist_m,
    ex_d_dist        = ex_main$d_dist_m,
    ex_phi           = ex_main$prop_within_1500m,
    ex_omega         = ex_main$omega_corr,
    ex_p_base        = 100 * ex_main$govtarget_slc / ex_main$all,
    ex_gt            = ex_main$govtarget_slc,
    ex_p_dutch       = 100 * ex_main$dutch_slc / ex_main$all,
    ex_dutch         = ex_main$dutch_slc,
    ex_p_ebike       = 100 * ex_main$ebike_slc / ex_main$all,
    ex_ebike         = ex_main$ebike_slc,
    ex_cc            = ex_main$corr_central_slc,
    ex_cc_share      = 100 * ex_main$corr_central_slc / ex_main$all,
    ex_ch            = ex_main$corr_high_slc,
    ex_trips_day     = ex_main$corr_central_slc * 1.9,
    ex_trips_yr      = ex_main$corr_central_slc * 1.9 * 220,
    ex_km_yr         = ex_main$corr_central_slc * 1.9 * 220 * ex_main$rf_dist_km,
    ex_ch_trips_day  = ex_main$corr_high_slc * 1.9,
    ex_car_div_pct   = ex_car_div_pct,
    ex_car_div_cyc   = ex_new_cyc * ex_car_div_pct / 100,
    pv_t_central     = pv_t_central,
    pv_h_central     = pv_h_central,
    amat_tot_inst    = amat_tot_inst,
    amat_tot_lag     = amat_tot_lag,
    amat_lag_drop_pct = 100 * (1 - amat_tot_lag / amat_tot_inst),
    health_amb_pct   = sum(amat_tbl$share_lag_pct[amat_tbl$stream %in% c("Health (Premature Death)", "Journey Ambience")])
  )

  list(
    corr = corr, corr_plot = simplify_corridor_classes(corr),
    od = od, core = core, sec_sum = sec_sum, class_sum = class_sum,
    towns = towns, ex_main = ex_main, ex_four = ex_four,
    lag_df = lag_df, lag_pv_raw = lag_pv_raw, amat_tbl = amat_tbl,
    stats = stats
  )
}

# --- Table formatters ---

tbl_infra <- function(dat) {
  dat$class_sum |>
    transmute(
      `Corridor Classification` = classification,
      Links = n_links,
      `Length (km)` = sprintf("%.2f", length_km),
      `Share (%)` = sprintf("%.1f%%", share_pct)
    ) |>
    kable(
      align = c("l", "r", "r", "r"),
      caption = "Preferred Oxfordshire–Uxbridge corridor breakdown by infrastructure classification (v0.5.2, Sections 13 to 11)."
    )
}

tbl_scenarios <- function(dat) {
  s <- dat$stats
  c_3km  <- c(s$base_cyc_3km, s$gt_cyc_3km, s$cc_cyc_3km, s$ch_cyc_3km, s$du_cyc_3km, s$eb_cyc_3km)
  c_core <- c(s$base_cyc_core, s$gt_cyc_core, s$cc_cyc_core, s$ch_cyc_core, s$du_cyc_core, s$eb_cyc_core)

  tibble(
    Scenario = c(
      "Baseline (2011 Census Observed)",
      "PCT Government Target (National Benchmark)",
      "Corridor Central (50% Go Dutch, attenuated)",
      "Corridor High (60% E-bikes, attenuated)",
      "PCT Go Dutch (Unattenuated Area Ceiling)",
      "PCT E-bikes (Unattenuated Area Ceiling)"
    ),
    `3 km Cyclists` = round(c_3km),
    `3 km New`      = round(c_3km - s$base_cyc_3km),
    `3 km Share`    = percent(c_3km / s$tot_comm_3km, accuracy = 0.1),
    `Core Cyclists` = round(c_core),
    `Core New`      = round(c_core - s$base_cyc_core),
    `Core Share`    = percent(c_core / s$tot_comm_core, accuracy = 0.1)
  ) |>
    mutate(across(c(`3 km Cyclists`, `3 km New`, `Core Cyclists`, `Core New`), comma)) |>
    kable(
      align = c("l", "r", "r", "r", "r", "r", "r"),
      caption = "Estimated steady-state commute cycling uptake along the Oxfordshire–Uxbridge corridor (2011 Census OD baseline, inter-LSOA pairs <= 20 km)."
    )
}

tbl_four_examples <- function(dat) {
  dat$ex_four |>
    transmute(
      `Desire Line` = gsub(" \\(.*\\)", "", corridor_pair),
      `Dist (km)` = sprintf("%.2f", rf_dist_km),
      `Slope (%)` = sprintf("%.2f", rf_avslope_perc),
      N = all,
      Car = sprintf("%.0f%%", 100 * car_driver / all),
      Exposure = sprintf("%.2f", omega_corr),
      Base = bicycle,
      Central = sprintf("%.1f", corr_central_slc),
      High = sprintf("%.1f", corr_high_slc),
      `Go Dutch` = sprintf("%.1f", dutch_slc)
    ) |>
    kable(
      align = c("l", "r", "r", "r", "r", "r", "r", "r", "r", "r"),
      caption = "Worked-example comparison across four corridor-aligned 2011 OD desire lines spanning Oxfordshire, Buckinghamshire, and Uxbridge."
    )
}

tbl_lag_pv <- function(dat) {
  dat$lag_pv_raw |>
    transmute(
      `Adoption Profile` = Profile,
      `Yr 1 Share` = percent(Yr1, accuracy = 1),
      `Yr 3 Share` = percent(Yr3, accuracy = 1),
      `Yr 5 Share` = percent(Yr5, accuracy = 1),
      `40-Yr Transport PV (3.5%)` = sprintf("%.3f (%+.1f%%)", pv_t, 100 * (pv_t - 1)),
      `40-Yr Health PV (1.5%)` = sprintf("%.3f (%+.1f%%)", pv_h, 100 * (pv_h - 1))
    ) |>
    kable(
      align = c("l", "r", "r", "r", "r", "r"),
      caption = "Impact of behavioural adoption ramp-up on 40-year Present Value benefits (2030–2069) relative to AMAT's instant-jump default."
    )
}

tbl_amat_scale <- function(dat) {
  s <- dat$stats
  rows <- dat$amat_tbl |>
    transmute(
      `Appraisal Stream` = stream,
      `Instant PVB (£m)` = sprintf("%.2f", pvb_instant_m),
      `5-Yr Ramp PVB (£m)` = sprintf("%.2f", pvb_lag_m),
      `Share of PVB` = sprintf("%.1f%%", share_lag_pct),
      `Valuation Basis` = notes
    )
  total_row <- tibble(
    `Appraisal Stream` = "**Total Core Commute PVB**",
    `Instant PVB (£m)` = sprintf("**%.2f**", s$amat_tot_inst),
    `5-Yr Ramp PVB (£m)` = sprintf("**%.2f**", s$amat_tot_lag),
    `Share of PVB` = "**100.0%**",
    `Valuation Basis` = sprintf("Overall ramp-up impact: %.1f%%", -s$amat_lag_drop_pct)
  )
  bind_rows(rows, total_row) |>
    kable(
      align = c("l", "r", "r", "r", "l"),
      caption = "Illustrative 40-year PVB (2023 prices, Core Aligned commute subset only) from railactive/amat under instant jump vs Central 5-year ramp-up."
    )
}

tbl_from_csv <- function(path, caption, align = NULL, col_names = NULL) {
  df <- read_csv(path, show_col_types = FALSE)
  if (!is.null(col_names)) names(df) <- col_names
  if (is.null(align)) align <- rep("l", ncol(df))
  kable(df, align = align, caption = caption)
}

# --- Plot builders ---

plot_corridor_map <- function(dat) {
  corr_27700 <- st_transform(dat$corr, 27700)
  buf_3km <- st_transform(st_union(st_buffer(corr_27700, 3000)), 4326)
  s <- dat$stats

  towns_lbl <- dat$towns |>
    mutate(
      nudge_x = case_when(
        label == "Banbury" ~ -0.02, label == "Brackley" ~ 0.055,
        label == "Buckingham" ~ 0.075, label == "Aylesbury" ~ -0.065,
        label == "Wendover" ~ 0.065, label == "Great Missenden" ~ -0.10,
        label == "Amersham" ~ 0.065, label == "Chalfont St Peter" ~ -0.11,
        label == "Denham" ~ -0.065, label == "Uxbridge" ~ 0.025, TRUE ~ 0
      ),
      nudge_y = case_when(
        label == "Banbury" ~ 0.026, label == "Brackley" ~ 0.022,
        label == "Buckingham" ~ 0.015, label == "Aylesbury" ~ -0.025,
        label == "Wendover" ~ 0.015, label == "Great Missenden" ~ -0.018,
        label == "Amersham" ~ 0.018, label == "Chalfont St Peter" ~ -0.018,
        label == "Denham" ~ -0.022, label == "Uxbridge" ~ -0.024, TRUE ~ 0
      )
    )

  p_a <- ggplot() +
    geom_sf(data = buf_3km, fill = "#e2e8f0", colour = "#cbd5e1", linewidth = 0.3, alpha = 0.65) +
    geom_sf(data = dat$corr_plot, aes(colour = cls_grp), linewidth = 1.25) +
    geom_point(data = towns_lbl, aes(x = lon, y = lat), size = 1.8, colour = "#0f172a") +
    geom_text(
      data = towns_lbl,
      aes(x = lon + nudge_x, y = lat + nudge_y, label = label),
      size = 2.6, fontface = "bold", colour = "#1e293b"
    ) +
    scale_colour_manual(values = CORRIDOR_PALETTE, name = "Infrastructure Type") +
    coord_sf(xlim = c(-1.48, -0.32), ylim = c(51.49, 52.13), expand = FALSE) +
    labs(title = "A. Corridor Alignment & 3 km Catchment", x = NULL, y = NULL) +
    theme_rail(9) +
    theme(
      legend.position = "bottom",
      legend.box = "vertical",
      axis.text = element_text(size = 7.5, colour = "#64748b")
    ) +
    guides(colour = guide_legend(ncol = 2, override.aes = list(linewidth = 2)))

  od_plot <- dat$od |>
    mutate(new_cyc = corr_central_slc - bicycle) |>
    filter(new_cyc >= 2.5) |>
    arrange(new_cyc)

  ex_label <- sprintf(
    "Worked example:\nKing's Sutton -> Banbury\n(%.1f km, %d -> %.1f Central)",
    s$ex_dist, s$ex_cyc, s$ex_cc
  )

  p_b <- ggplot() +
    geom_sf(data = buf_3km, fill = "#f1f5f9", colour = "#cbd5e1", linewidth = 0.3) +
    geom_sf(data = dat$corr_plot, colour = "#94a3b8", linewidth = 0.85, alpha = 0.85) +
    geom_segment(
      data = od_plot,
      aes(x = olon, y = olat, xend = dlon, yend = dlat, colour = new_cyc, linewidth = new_cyc),
      alpha = 0.72, lineend = "round"
    ) +
    geom_segment(
      data = dat$ex_main,
      aes(x = olon, y = olat, xend = dlon, yend = dlat),
      colour = "#dc2626", linewidth = 1.8, lineend = "round"
    ) +
    geom_point(data = dat$ex_main, aes(x = olon, y = olat), colour = "#dc2626", fill = "white", shape = 21, size = 2.6, stroke = 1.1) +
    geom_point(data = dat$ex_main, aes(x = dlon, y = dlat), colour = "#dc2626", fill = "#dc2626", shape = 21, size = 2.6) +
    annotate(
      "label", x = -1.16, y = 52.085, label = ex_label,
      size = 2.4, colour = "#991b1b", fill = "#fef2f2", linewidth = 0.3, hjust = 0
    ) +
    scale_colour_viridis_c(option = "plasma", direction = -1, name = "New Commute Cyclists (Central)") +
    scale_linewidth_continuous(range = c(0.35, 1.8), guide = "none") +
    coord_sf(xlim = c(-1.48, -0.32), ylim = c(51.49, 52.13), expand = FALSE) +
    labs(title = "B. 2011 OD Commute Uptake Desire Lines", x = NULL, y = NULL) +
    theme_rail(9) +
    theme(legend.position = "bottom", axis.text = element_text(size = 7.5, colour = "#64748b")) +
    guides(colour = guide_colorbar(barwidth = 10, barheight = 0.55))

  p_a + p_b
}

plot_dist_lad <- function(dat) {
  dist_df <- dat$od |>
    mutate(
      dist_band = cut(
        rf_dist_km,
        breaks = c(0, 2, 4, 6, 8, 10, 15, 20),
        labels = c("0-2", "2-4", "4-6", "6-8", "8-10", "10-15", "15-20"),
        include.lowest = TRUE
      )
    ) |>
    group_by(dist_band) |>
    summarise(
      `Corridor Central (Unpowered)` = sum(corr_central_slc - bicycle),
      `Additional E-bike Uplift` = sum(corr_high_slc - corr_central_slc),
      .groups = "drop"
    ) |>
    pivot_longer(-dist_band, names_to = "Component", values_to = "New_Cyclists") |>
    mutate(Component = factor(Component, levels = c("Additional E-bike Uplift", "Corridor Central (Unpowered)")))

  p_dist <- ggplot(dist_df, aes(x = dist_band, y = New_Cyclists, fill = Component)) +
    geom_col(width = 0.72) +
    scale_fill_manual(values = c("Corridor Central (Unpowered)" = "#1e3a8a", "Additional E-bike Uplift" = "#0ea5e9"), name = NULL) +
    scale_y_continuous(labels = comma) +
    labs(title = "A. New Commute Cyclists by Trip Distance", x = "Fastest-route distance band (km)", y = "Additional commute cyclists") +
    theme_rail(9.5) +
    theme(legend.position = "bottom")

  lad_df <- dat$od |>
    group_by(lad_name1) |>
    summarise(
      Baseline = sum(bicycle),
      `New (Corridor Central)` = sum(corr_central_slc - bicycle),
      .groups = "drop"
    ) |>
    filter(Baseline + `New (Corridor Central)` >= 50) |>
    mutate(tot = Baseline + `New (Corridor Central)`) |>
    pivot_longer(c(Baseline, `New (Corridor Central)`), names_to = "Stage", values_to = "Cyclists") |>
    mutate(
      lad_name1 = reorder(lad_name1, tot),
      Stage = factor(Stage, levels = c("New (Corridor Central)", "Baseline"))
    )

  p_lad <- ggplot(lad_df, aes(x = lad_name1, y = Cyclists, fill = Stage)) +
    geom_col(width = 0.68) +
    coord_flip() +
    scale_fill_manual(values = c("Baseline" = "#64748b", "New (Corridor Central)" = "#059669"), name = NULL) +
    scale_y_continuous(labels = comma) +
    labs(title = "B. Commute Cyclists by Origin District (2011 LAD)", x = NULL, y = "Commute cyclists (3 km catchment)") +
    theme_rail(9.5) +
    theme(legend.position = "bottom")

  p_dist + p_lad
}

plot_worked_example <- function(dat) {
  ex_main <- dat$ex_main
  s <- dat$stats
  corr_zoom <- dat$corr_plot |> filter(section %in% c("13", "10", "8"))
  od_zoom <- dat$od |>
    filter(olon >= -1.42, olon <= -1.16, olat >= 52.00, olat <= 52.09,
           dlon >= -1.42, dlon <= -1.16, dlat >= 52.00, dlat <= 52.09) |>
    mutate(new_cyc = corr_central_slc - bicycle) |>
    filter(new_cyc >= 1.5)

  p_zoom <- ggplot() +
    geom_sf(data = corr_zoom, aes(colour = cls_grp), linewidth = 1.8) +
    geom_segment(
      data = od_zoom,
      aes(x = olon, y = olat, xend = dlon, yend = dlat),
      colour = "#64748b", alpha = 0.35, linewidth = 0.5
    ) +
    geom_segment(
      data = ex_main,
      aes(x = olon, y = olat, xend = dlon, yend = dlat),
      colour = "#dc2626", linewidth = 2.0,
      arrow = arrow(length = unit(0.22, "cm"), type = "closed")
    ) +
    geom_point(data = ex_main, aes(x = olon, y = olat), size = 3.5, shape = 21, fill = "white", colour = "#dc2626", stroke = 1.4) +
    geom_point(data = ex_main, aes(x = dlon, y = dlat), size = 3.5, shape = 21, fill = "#dc2626", colour = "#dc2626") +
    annotate("label", x = ex_main$olon + 0.008, y = ex_main$olat - 0.009,
             label = sprintf("Origin: King's Sutton\n(E01027288, %d m to spine)", round(s$ex_o_dist)), size = 2.7, hjust = 0, fill = "white") +
    annotate("label", x = ex_main$dlon + 0.007, y = ex_main$dlat + 0.011,
             label = sprintf("Destination: Banbury Centre\n(E01028435, %d m to spine)", round(s$ex_d_dist)), size = 2.7, hjust = 0, fill = "white") +
    scale_colour_manual(values = CORRIDOR_PALETTE, name = "Greenway Class") +
    coord_sf(xlim = c(-1.38, -1.19), ylim = c(52.005, 52.085), expand = FALSE) +
    labs(title = "A. Spatial Alignment: King's Sutton -> Banbury", x = NULL, y = NULL) +
    theme_rail(9) +
    theme(legend.position = "bottom", axis.text = element_text(size = 7.5)) +
    guides(colour = guide_legend(ncol = 2))

  ex_bars <- tibble(
    Scenario = factor(
      c("Baseline\n(2011)", "PCT Gov\nTarget", "Corridor\nCentral", "Corridor High\n(E-bikes)", "Go Dutch\nCeiling", "E-bikes\nCeiling"),
      levels = c("Baseline\n(2011)", "PCT Gov\nTarget", "Corridor\nCentral", "Corridor High\n(E-bikes)", "Go Dutch\nCeiling", "E-bikes\nCeiling")
    ),
    Cyclists = c(ex_main$bicycle, ex_main$govtarget_slc, ex_main$corr_central_slc,
                 ex_main$corr_high_slc, ex_main$dutch_slc, ex_main$ebike_slc),
    Highlight = c("Base", "Bench", "Adopted", "Adopted", "Bench", "Bench")
  )

  p_bar <- ggplot(ex_bars, aes(x = Scenario, y = Cyclists, fill = Highlight)) +
    geom_col(width = 0.65) +
    geom_text(aes(label = sprintf("%.1f", Cyclists)), vjust = -0.4, size = 3.0, fontface = "bold", colour = "#0f172a") +
    scale_fill_manual(values = c("Base" = "#94a3b8", "Bench" = "#cbd5e1", "Adopted" = "#1e3a8a"), guide = "none") +
    scale_y_continuous(limits = c(0, 20.5)) +
    labs(title = sprintf("B. Uptake Ladder (N = %d commuters, %.1f km)", s$ex_n, s$ex_dist), x = NULL, y = "Daily commute cyclists") +
    theme_rail(9) +
    theme(axis.text.x = element_text(size = 8))

  p_zoom + p_bar + plot_layout(widths = c(1.25, 1))
}

plot_lag_profiles <- function(dat) {
  lag_pal <- c(
    "Instant (AMAT Default)" = "#64748b",
    "Fast Ramp-Up (3-yr)"    = "#0284c7",
    "Central Ramp-Up (5-yr)" = "#1e3a8a",
    "Slow Ramp-Up (8-yr)"    = "#d97706"
  )

  p_lag1 <- ggplot(dat$lag_df |> filter(Year <= 2050), aes(x = Year, y = Annual_Trips, colour = Profile, linetype = Profile)) +
    geom_line(linewidth = 1.05) +
    scale_colour_manual(values = lag_pal, name = NULL) +
    scale_linetype_manual(values = c("dashed", "solid", "solid", "solid"), name = NULL) +
    scale_y_continuous(labels = comma) +
    labs(title = "A. Annual Commute Trips (King's Sutton -> Banbury)", x = "Appraisal year (first 20 yrs shown)", y = "One-way commute cycle trips / yr") +
    theme_rail(9.5) +
    theme(legend.position = "bottom") +
    guides(colour = guide_legend(ncol = 2))

  p_lag2 <- ggplot(dat$lag_df |> filter(Year <= 2045), aes(x = Year, y = Health_Eff, colour = Profile, linetype = Profile)) +
    geom_line(linewidth = 1.05) +
    scale_colour_manual(values = lag_pal, name = NULL) +
    scale_linetype_manual(values = c("dashed", "solid", "solid", "solid"), name = NULL) +
    scale_y_continuous(labels = percent) +
    labs(title = "B. Effective Health Share (Behavioural + 5-Yr Health Lag)", x = "Appraisal year (first 15 yrs shown)", y = "Share of steady-state health effect") +
    theme_rail(9.5) +
    theme(legend.position = "bottom") +
    guides(colour = guide_legend(ncol = 2))

  p_lag1 + p_lag2
}
