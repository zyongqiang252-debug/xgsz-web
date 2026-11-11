package com.cows.service;

import com.cows.entity.LbsInfo;

public interface LbsService {
    java.util.List<LbsInfo> getAllLocations();
    LbsInfo getLocationById(Long id);
    int addLocation(LbsInfo info);
    int updateLocation(LbsInfo info);
    int deleteLocation(Long id);
    void saveLocationInfo(LbsInfo lbsInfo);
}
