package com.cows.mapper;

import com.cows.entity.LbsInfo;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface LbsMapper {
    java.util.List<LbsInfo> findAllLocations();
    LbsInfo findLocationById(Long id);
    int updateLocation(LbsInfo info);
    int deleteLocation(Long id);
    void insertLbsInfo(LbsInfo lbsInfo);
}
