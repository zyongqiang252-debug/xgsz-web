package com.cows.serviceImpl;

import com.cows.entity.LbsInfo;
import com.cows.service.LbsService;
import com.cows.mapper.LbsMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LbsServiceImpl implements LbsService {
    @Override public java.util.List<LbsInfo> getAllLocations(){return lbsMapper.findAllLocations();}
    @Override public LbsInfo getLocationById(Long id){return lbsMapper.findLocationById(id);}
    @Override public int addLocation(LbsInfo info){lbsMapper.insertLbsInfo(info);return Math.toIntExact(info.getId());}
    @Override public int updateLocation(LbsInfo info){return lbsMapper.updateLocation(info);}
    @Override public int deleteLocation(Long id){return lbsMapper.deleteLocation(id);}
    @Autowired
    private LbsMapper lbsMapper;

    @Override
    public void saveLocationInfo(LbsInfo lbsInfo) {
        lbsMapper.insertLbsInfo(lbsInfo);
    }
}
